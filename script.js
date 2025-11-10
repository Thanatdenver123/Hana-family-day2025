// ตัวแปรทั่วไป
let allPhotos = [];
let isGridView = true;
const API_URL = 'http://localhost:5000'; // เปลี่ยนตาม server ของคุณ

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadAllPhotos();
});

// Event Listeners
function initializeEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });

    // Gallery View Toggle
    document.getElementById('gridView').addEventListener('click', () => setGalleryView('grid'));
    document.getElementById('listView').addEventListener('click', () => setGalleryView('list'));

    // Search
    document.getElementById('imageInput').addEventListener('change', handleImagePreview);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);

    // Upload
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
    uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    uploadArea.addEventListener('drop', handleFilesDrop);
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('imageModal').addEventListener('click', (e) => {
        if (e.target.id === 'imageModal') closeModal();
    });
}

// Tab Functionality
function handleTabChange(e) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    e.target.classList.add('active');
    const tabName = e.target.dataset.tab;
    document.getElementById(tabName).classList.add('active');
}

// Gallery View
function setGalleryView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    
    const container = document.getElementById('galleryContainer');
    if (view === 'grid') {
        document.getElementById('gridView').classList.add('active');
        container.classList.remove('list-view');
    } else {
        document.getElementById('listView').classList.add('active');
        container.classList.add('list-view');
    }
}

// Load Photos
async function loadAllPhotos() {
    try {
        const response = await fetch(`${API_URL}/api/photos`);
        const data = await response.json();
        allPhotos = data.photos || [];
        displayPhotos(allPhotos);
    } catch (error) {
        console.error('Error loading photos:', error);
        document.getElementById('galleryContainer').innerHTML = 
            '<div class="loading">❌ ไม่สามารถโหลดรูปภาพ</div>';
    }
}

// Display Photos
function displayPhotos(photos) {
    const container = document.getElementById('galleryContainer');
    
    if (photos.length === 0) {
        container.innerHTML = '<div class="loading">📭 ไม่พบรูปภาพ</div>';
        return;
    }
    
    container.innerHTML = photos.map(photo => `
        <div class="gallery-item" onclick="openModal('${photo.url}', '${photo.name}', '${photo.driveLink}')">
            <img src="${photo.url}" alt="${photo.name}" loading="lazy">
            <div class="gallery-item-info">
                <h3>${photo.name}</h3>
                <p>${new Date(photo.uploadedAt).toLocaleDateString('th-TH')}</p>
            </div>
        </div>
    `).join('');
}

// Image Preview for Search
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('searchPreview');
            const img = document.getElementById('previewImg');
            img.src = event.target.result;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
}

// Search Similar Images
async function handleSearch() {
    const input = document.getElementById('imageInput');
    if (!input.files[0]) {
        alert('⚠️ กรุณาเลือกรูปภาพ');
        return;
    }

    const formData = new FormData();
    formData.append('image', input.files[0]);

    try {
        const response = await fetch(`${API_URL}/api/search`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        const results = document.getElementById('searchResults');
        
        if (data.results && data.results.length > 0) {
            results.innerHTML = data.results.map(photo => `
                <div class="gallery-item" onclick="openModal('${photo.url}', '${photo.name}', '${photo.driveLink}')">
                    <img src="${photo.url}" alt="${photo.name}">
                    <div class="gallery-item-info">
                        <h3>${photo.name}</h3>
                        <p>ความคล้ายคลึง: ${(photo.similarity * 100).toFixed(1)}%</p>
                    </div>
                </div>
            `).join('');
        } else {
            results.innerHTML = '<div class="loading">🔍 ไม่พบรูปภาพที่คล้ายกัน</div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('❌ เกิดข้อผิดพลาดในการค้นหา');
    }
}

// Upload Files
function handleFilesDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    uploadFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    uploadFiles(files);
}

async function uploadFiles(files) {
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadResults = document.getElementById('uploadResults');
    uploadProgress.style.display = 'block';
    uploadResults.innerHTML = '';

    let completed = 0;

    for (let file of files) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            completed++;
            const percent = (completed / files.length) * 100;
            document.querySelector('.progress-fill').style.width = percent + '%';
            document.getElementById('uploadStatus').textContent = 
                `อัปโหลด ${completed}/${files.length} ไฟล์`;

            if (data.success) {
                uploadResults.innerHTML += `
                    <div style="padding: 10px; margin-top: 10px; background: #d4edda; border-radius: 8px;">
                        ✅ ${file.name} - อัปโหลดสำเร็จ
                    </div>
                `;
            } else {
                uploadResults.innerHTML += `
                    <div style="padding: 10px; margin-top: 10px; background: #f8d7da; border-radius: 8px;">
                        ❌ ${file.name} - ${data.error}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    }

    setTimeout(() => {
        loadAllPhotos();
        uploadProgress.style.display = 'none';
        document.querySelector('.progress-fill').style.width = '0%';
    }, 1500);
}

// Modal Functions
function openModal(url, name, driveLink) {
    const modal = document.getElementById('imageModal');
    document.getElementById('modalImage').src = url;
    document.getElementById('imageName').textContent = name;
    document.getElementById('driveLink').href = driveLink;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
}