import sys
import json
import base64
import cv2
import numpy as np
from paddleocr import PaddleOCR
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_image(image_data):
    try:
        # Initialize PaddleOCR
        # use_angle_cls=True enables angle classification which is useful for rotated images
        # lang='en' for English
        # Removed show_log=False as it caused error
        ocr = PaddleOCR(use_angle_cls=True, lang='en')

        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not decode image")

        # Run OCR
        # logger.info(f"Image shape: {img.shape}")
        # Removed cls=True as it caused error
        result = ocr.ocr(img)

        extracted_text = []
        structured_data = []

        # print(f"OCR Result Type: {type(result)}", file=sys.stderr)
        
        # Handle dictionary output (PaddleX/PaddleOCR v3+ behavior)
        if isinstance(result, dict) and 'rec_texts' in result:
            rec_texts = result.get('rec_texts', [])
            rec_scores = result.get('rec_scores', [])
            rec_boxes = result.get('rec_boxes', [])
            
            for i, text in enumerate(rec_texts):
                confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                box = rec_boxes[i].tolist() if hasattr(rec_boxes[i], 'tolist') else rec_boxes[i]
                
                extracted_text.append(text)
                structured_data.append({
                    "text": text,
                    "confidence": float(confidence),
                    "box": box
                })
        
        # Handle list output (Legacy PaddleOCR behavior)
        elif isinstance(result, list) and len(result) > 0:
            # Check if result[0] is a list (standard legacy behavior)
            if isinstance(result[0], list):
                for line in result[0]:
                    # line format: [[box_coords], [text, confidence]]
                    if line:
                        text = line[1][0]
                        confidence = line[1][1]
                        box = line[0]
                        
                        extracted_text.append(text)
                        structured_data.append({
                            "text": text,
                            "confidence": float(confidence),
                            "box": box
                        })
            # Check if result[0] is a dictionary (PaddleX/PaddleOCR v3+ behavior wrapped in list)
            elif isinstance(result[0], dict) and 'rec_texts' in result[0]:
                res_dict = result[0]
                rec_texts = res_dict.get('rec_texts', [])
                rec_scores = res_dict.get('rec_scores', [])
                rec_boxes = res_dict.get('rec_boxes', [])
                
                for i, text in enumerate(rec_texts):
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                    box = rec_boxes[i].tolist() if hasattr(rec_boxes[i], 'tolist') else rec_boxes[i]
                    
                    extracted_text.append(text)
                    structured_data.append({
                        "text": text,
                        "confidence": float(confidence),
                        "box": box
                    })
            else:
                 logger.warning(f"Unexpected result[0] format: {result[0]}")
        else:
             logger.warning(f"Unexpected result format: {result}")

        # Reconstruct lines based on Y-coordinates
        lines = []
        if structured_data:
            # Sort by Y-coordinate of the top-left corner
            # Ensure box is in expected format [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            # If it's a flat list [x1, y1, x2, y2, ...], convert or handle it
            
            def get_y_min(item):
                box = item['box']
                if isinstance(box[0], list):
                    return box[0][1]
                else:
                    # Assume flat list [x1, y1, x2, y2, ...]
                    return box[1]

            structured_data.sort(key=get_y_min)
            
            current_line = []
            current_y = -1
            y_threshold = 10  # Pixel threshold for same line
            
            for item in structured_data:
                box = item['box']
                
                if isinstance(box[0], list):
                    y_center = (box[0][1] + box[3][1]) / 2
                    x_min = box[0][0]
                elif len(box) >= 8:
                    # Assume flat list [x1, y1, x2, y2, x3, y3, x4, y4]
                    y_center = (box[1] + box[7]) / 2
                    x_min = box[0]
                elif len(box) >= 4:
                    # Assume flat list [x1, y1, x2, y2] (top-left, bottom-right)
                    y_center = (box[1] + box[3]) / 2
                    x_min = box[0]
                else:
                    # Fallback
                    y_center = 0
                    x_min = 0
                
                if current_y == -1:
                    current_y = y_center
                    current_line.append(item)
                elif abs(y_center - current_y) < y_threshold:
                    current_line.append(item)
                else:
                    # Sort current line by X-coordinate
                    def get_x_min(item):
                        b = item['box']
                        if isinstance(b[0], list):
                            return b[0][0]
                        else:
                            return b[0]

                    current_line.sort(key=get_x_min)
                    lines.append(current_line)
                    current_line = [item]
                    current_y = y_center
            
            if current_line:
                def get_x_min(item):
                    b = item['box']
                    if isinstance(b[0], list):
                        return b[0][0]
                    else:
                        return b[0]
                current_line.sort(key=get_x_min)
                lines.append(current_line)

        # Build full text from lines
        full_text_lines = []
        for line in lines:
            line_text = " ".join([item['text'] for item in line])
            full_text_lines.append(line_text)
            
        full_text = "\n".join(full_text_lines)
        
        return {
            "success": True,
            "text": full_text,
            "data": structured_data
        }

    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    try:
        # Read input from stdin
        # Expecting a JSON object with "imageBase64" key
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input data received"}))
            sys.exit(1)

        try:
            request = json.loads(input_data)
        except json.JSONDecodeError:
             print(json.dumps({"success": False, "error": "Invalid JSON input"}))
             sys.exit(1)
            
        image_base64 = request.get("imageBase64")
        
        if not image_base64:
            print(json.dumps({"success": False, "error": "imageBase64 is required"}))
            sys.exit(1)

        result = process_image(image_base64)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Unexpected error: {str(e)}"}))
        sys.exit(1)
