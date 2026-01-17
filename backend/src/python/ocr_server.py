import logging
from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
import numpy as np
import cv2
import base64
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize PaddleOCR globally
logger.info("Initializing PaddleOCR model...")
try:
    # use_textline_orientation=True replaces deprecated use_angle_cls
    ocr = PaddleOCR(use_textline_orientation=True, lang='en')
    logger.info("PaddleOCR model initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize PaddleOCR: {str(e)}")
    sys.exit(1)

def process_image(image_base64):
    try:
        # Decode base64 image
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        img_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        # Perform OCR
        # Removed cls=True as it caused error with this version
        result = ocr.ocr(img)
        
        structured_data = []
        raw_text_lines = []

        # Handle different PaddleOCR versions/outputs
        # Logic copied from ocr_engine.py for robustness
        
        if isinstance(result, dict) and 'rec_texts' in result:
            rec_texts = result.get('rec_texts', [])
            rec_scores = result.get('rec_scores', [])
            rec_boxes = result.get('rec_boxes', [])
            
            for i, text in enumerate(rec_texts):
                confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                box = rec_boxes[i].tolist() if hasattr(rec_boxes[i], 'tolist') else rec_boxes[i]
                
                raw_text_lines.append(text)
                structured_data.append({
                    "text": text,
                    "confidence": float(confidence),
                    "box": box
                })
        
        elif isinstance(result, list) and len(result) > 0:
            if isinstance(result[0], list):
                for line in result[0]:
                    if line:
                        text = line[1][0]
                        confidence = line[1][1]
                        box = line[0]
                        
                        raw_text_lines.append(text)
                        structured_data.append({
                            "text": text,
                            "confidence": float(confidence),
                            "box": box
                        })
            elif isinstance(result[0], dict) and 'rec_texts' in result[0]:
                res_dict = result[0]
                rec_texts = res_dict.get('rec_texts', [])
                rec_scores = res_dict.get('rec_scores', [])
                rec_boxes = res_dict.get('rec_boxes', [])
                
                for i, text in enumerate(rec_texts):
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                    box = rec_boxes[i].tolist() if hasattr(rec_boxes[i], 'tolist') else rec_boxes[i]
                    
                    raw_text_lines.append(text)
                    structured_data.append({
                        "text": text,
                        "confidence": float(confidence),
                        "box": box
                    })

        # Reconstruct lines based on Y-coordinates
        lines = []
        if structured_data:
            # Helper to safely get y_min
            def get_y_min(item):
                box = item['box']
                if isinstance(box[0], list):
                    return box[0][1]
                else:
                    return box[1]

            structured_data.sort(key=get_y_min)
            
            current_line = []
            current_y = -1
            y_threshold = 10  # pixels threshold for same line

            for item in structured_data:
                box = item['box']
                if isinstance(box[0], list):
                    y_center = (box[0][1] + box[3][1]) / 2
                elif len(box) >= 8:
                    y_center = (box[1] + box[7]) / 2
                elif len(box) >= 4:
                    y_center = (box[1] + box[3]) / 2
                else:
                    y_center = 0
                
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
                    lines.append(" ".join([i['text'] for i in current_line]))
                    
                    current_line = [item]
                    current_y = y_center
            
            # Append last line
            if current_line:
                def get_x_min(item):
                    b = item['box']
                    if isinstance(b[0], list):
                        return b[0][0]
                    else:
                        return b[0]
                current_line.sort(key=get_x_min)
                lines.append(" ".join([i['text'] for i in current_line]))

        reconstructed_text = "\n".join(lines)

        return {
            "success": True,
            "text": reconstructed_text,
            "structured_data": structured_data
        }

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return {"success": False, "error": str(e)}

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    try:
        data = request.get_json()
        if not data or 'imageBase64' not in data:
            return jsonify({"success": False, "error": "No imageBase64 provided"}), 400
        
        image_base64 = data['imageBase64']
        result = process_image(image_base64)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Endpoint error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model": "paddleocr"})

if __name__ == '__main__':
    port = 5001
    logger.info(f"Starting OCR Server on port {port}")
    app.run(host='0.0.0.0', port=port)
