from flask import Flask, request, jsonify  
from flask_cors import CORS  
from google.oauth2.service_account import Credentials  
from google.auth.transport.requests import Request  
from googleapiclient.discovery import build  
from googleapiclient.http import MediaFileUpload  
import os  
from datetime import datetime  
import cv2  
import numpy as np  
from sklearn.metrics.pairwise import cosine_similarity  
import io  
from PIL import Image  
import base64  

app = Flask(__name__)  
CORS(app)  

# Google Drive API Setup  
SCOPES = ['https://www.googleapis.com/auth/drive']  
DRIVE_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'  # เปลี่ยนเป็น Folder ID ของคุณ  
API_KEY = 'AIzaSyBCYG3PtAen7P7iqttLyTmOEzLGEr-r7rI'  

# Initialize Google Drive Service  
try:  
    credentials = Credentials.from_service_account_file(  
        'service_account.json', scopes=SCOPES)  
    drive_service = build('drive', 'v3', credentials=credentials)  
except:  
    print("⚠️ ไม่พบไฟล์ service_account.json - ใช้ API Key แทน")  

# In-memory storage for image embeddings  
image_cache = {}  

@app.route('/api/photos', methods=['GET'])  
def get_photos():  
    """ดึงรายชื่อรูปภาพทั้งหมดจาก Google Drive"""  
    try:  
        query = f"'{DRIVE_FOLDER_ID}' in parents and trashed=false and mimeType contains 'image/'"  
        results = drive_service.files().list(  
            q=query,  
            spaces='drive',  
            fields='files(id, name, webContentLink, createdTime, thumbnailLink)',  
            pageSize=100  
        ).execute()  

        files = results.get('files', [])  
        photos = []  

        for file in files:  
            photos.append({  
                'id': file['id'],  
                'name': file['name'],  
                'url': file.get('thumbnailLink', ''),  
                'driveLink': f"https://drive.google.com/file/d/{file['id']}/view",  
                'uploadedAt': file.get('createdTime', datetime.now().isoformat())  
            })  

        return jsonify({'success': True, 'photos': photos})  
    except Exception as e:  
        return jsonify({'success': False, 'error': str(e)}), 500  

@app.route('/api/upload', methods=['POST'])  
def upload_file():  
    """อัปโหลดรูปภาพไปยัง Google Drive"""  
    try:  
        if 'file' not in request.files:  
            return jsonify({'success': False, 'error': 'ไม่พบไฟล์'}), 400  

        file = request.files['file']  
        if file.filename == '':  
            return jsonify({'success': False, 'error': 