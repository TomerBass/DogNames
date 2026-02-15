// Auto-detect environment: use localhost for local development, otherwise use deployed backend
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'  // Local development
    : 'https://dogfinder-backend.onrender.com';  // Production (UPDATE THIS URL after deploying!)

// DOM Elements
const searchInput = document.getElementById('searchInput');
const uploadForm = document.getElementById('uploadForm');
const resultsGrid = document.getElementById('resultsGrid');
const loadingEl = document.getElementById('loadingSpinner');
const errorEl = document.getElementById('errorMessage');
const successEl = document.getElementById('successMessage');
const dogNameInput = document.getElementById('dogName');
const hebrewWarning = document.getElementById('hebrewWarning');
const toggleDetailsBtn = document.getElementById('toggleDetails');
const optionalFields = document.getElementById('optionalFields');
const dogAgeInput = document.getElementById('dogAge');
const dogLocationInput = document.getElementById('dogLocation');
const dogCityInput = document.getElementById('dogCity');
const optionalHebrewWarning = document.getElementById('optionalHebrewWarning');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const detailsModal = document.getElementById('detailsModal');
const detailsModalBody = document.getElementById('detailsModalBody');
const detailsModalClose = document.querySelector('.details-modal-close');

// Lightbox state
let currentImages = [];
let currentImageIndex = 0;

// Debounce for search
let searchTimeout;

// LocalStorage key for uploaded dogs
const UPLOADED_DOGS_KEY = 'uploadedDogs';

/**
 * Get list of uploaded dog IDs from localStorage
 */
function getUploadedDogs() {
    const stored = localStorage.getItem(UPLOADED_DOGS_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Add dog ID to uploaded list
 */
function addUploadedDog(dogId) {
    const uploaded = getUploadedDogs();
    if (!uploaded.includes(dogId)) {
        uploaded.push(dogId);
        localStorage.setItem(UPLOADED_DOGS_KEY, JSON.stringify(uploaded));
    }
}

/**
 * Remove dog ID from uploaded list
 */
function removeUploadedDog(dogId) {
    const uploaded = getUploadedDogs();
    const filtered = uploaded.filter(id => id !== dogId);
    localStorage.setItem(UPLOADED_DOGS_KEY, JSON.stringify(filtered));
}

/**
 * Check if dog was uploaded by this session
 */
function isMyDog(dogId) {
    return getUploadedDogs().includes(dogId);
}

// MobileNet model for dog detection
let model = null;

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    loadAllDogs();
    // Load MobileNet model for dog detection
    try {
        console.log('Loading dog detection model...');
        model = await mobilenet.load();
        console.log('Dog detection model loaded!');
    } catch (error) {
        console.error('Failed to load dog detection model:', error);
    }
});

// Search as you type
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 300);
});

// Search on Enter key press (exact match)
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        handleSearch(true);  // exact match
    }
});

// Upload form
uploadForm.addEventListener('submit', handleUpload);

// Hebrew detection on dog name input
dogNameInput.addEventListener('input', checkHebrewInput);

// Hebrew detection on optional fields
dogAgeInput.addEventListener('input', checkOptionalFieldsHebrew);
dogLocationInput.addEventListener('input', checkOptionalFieldsHebrew);
dogCityInput.addEventListener('input', checkOptionalFieldsHebrew);

// Toggle optional details
toggleDetailsBtn.addEventListener('click', toggleOptionalFields);

/**
 * Check if input contains English and show warning
 */
function checkHebrewInput() {
    const text = dogNameInput.value;
    // Check if text contains English letters (a-z, A-Z)
    const hasEnglish = /[a-zA-Z]/.test(text);

    if (hasEnglish) {
        hebrewWarning.style.display = 'block';
    } else {
        hebrewWarning.style.display = 'none';
    }
}

/**
 * Check if optional fields contain English and show warning
 */
function checkOptionalFieldsHebrew() {
    const ageText = dogAgeInput.value;
    const locationText = dogLocationInput.value;
    const cityText = dogCityInput.value;

    // Check if any of the fields contain English letters
    const hasEnglish = /[a-zA-Z]/.test(ageText) ||
                       /[a-zA-Z]/.test(locationText) ||
                       /[a-zA-Z]/.test(cityText);

    if (hasEnglish) {
        optionalHebrewWarning.style.display = 'block';
    } else {
        optionalHebrewWarning.style.display = 'none';
    }
}

/**
 * Toggle optional fields visibility
 */
function toggleOptionalFields() {
    if (optionalFields.style.display === 'none') {
        optionalFields.style.display = 'flex';
        toggleDetailsBtn.textContent = '- הסתר פרטים';
    } else {
        optionalFields.style.display = 'none';
        toggleDetailsBtn.textContent = '+ הוסף פרטים';
    }
}

/**
 * Load all dogs
 */
async function loadAllDogs() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/dogs`);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data.dogs);
    } catch (error) {
        console.error('Error:', error);
        showError(`Failed to load dogs. Is the backend running? (${error.message})`);
    } finally {
        hideLoading();
    }
}

/**
 * Handle search
 */
async function handleSearch(exact = false) {
    const searchTerm = searchInput.value.trim();

    try {
        showLoading();
        hideError();

        let url;
        if (searchTerm) {
            url = `${API_BASE_URL}/api/search?name=${encodeURIComponent(searchTerm)}`;
            if (exact) {
                url += '&exact=true';
            }
        } else {
            url = `${API_BASE_URL}/api/dogs`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data.dogs);
    } catch (error) {
        console.error('Error:', error);
        showError(`Search failed. Is the backend running? (${error.message})`);
    } finally {
        hideLoading();
    }
}

/**
 * Check if image contains a dog using MobileNet
 */
async function isDogImage(file) {
    if (!model) {
        console.warn('Model not loaded, skipping dog detection');
        return true; // If model isn't loaded, allow upload
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const predictions = await model.classify(img);
                    console.log('Predictions:', predictions);

                    // Check if any prediction includes dog-related terms
                    // Using very low threshold (0.005 = 0.5%) to be extremely lenient
                    const dogRelated = predictions.some(pred => {
                        const className = pred.className.toLowerCase();
                        return (
                            className.includes('dog') ||
                            className.includes('puppy') ||
                            className.includes('hound') ||
                            className.includes('retriever') ||
                            className.includes('terrier') ||
                            className.includes('poodle') ||
                            className.includes('shepherd') ||
                            className.includes('spaniel') ||
                            className.includes('beagle') ||
                            className.includes('bulldog') ||
                            className.includes('chihuahua') ||
                            className.includes('corgi') ||
                            className.includes('dachshund') ||
                            className.includes('husky') ||
                            className.includes('pug') ||
                            className.includes('labrador') ||
                            className.includes('canine') ||
                            className.includes('pet') ||
                            className.includes('animal')
                        ) && pred.probability > 0.005; // Extremely low threshold (0.5%)
                    });

                    // Fallback: if it detects any mammal/animal, probably a dog
                    const possiblyAnimal = predictions.some(pred => {
                        const className = pred.className.toLowerCase();
                        return (
                            className.includes('mammal') ||
                            className.includes('fur') ||
                            className.includes('animal') ||
                            className.includes('creature')
                        ) && pred.probability > 0.1;
                    });

                    resolve(dogRelated || possiblyAnimal);
                } catch (error) {
                    console.error('Error classifying image:', error);
                    resolve(true); // On error, allow upload
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Handle upload
 */
async function handleUpload(e) {
    e.preventDefault();

    const formData = new FormData(uploadForm);
    const files = formData.getAll('files');

    // Validate that all images contain dogs
    try {
        hideError();

        // Show validation message
        if (model && files.length > 0) {
            loadingEl.textContent = 'מוודא שהתמונות מכילות כלבים... 🐕';
            showLoading();
        } else {
            showLoading();
        }

        for (const file of files) {
            const hasDog = await isDogImage(file);
            if (!hasDog) {
                hideLoading();
                loadingEl.textContent = 'Loading...';
                showError(`התמונה "${file.name}" לא נראית כמו תמונה של כלב. אנא העלה תמונות של כלבים בלבד. 🐶`);
                return;
            }
        }

        // Change loading message to uploading
        loadingEl.textContent = 'מעלה תמונות...';

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Upload failed');
        }

        const data = await response.json();

        // Store dog ID in localStorage for deletion capability
        if (data.dog && data.dog.id) {
            addUploadedDog(data.dog.id);
        }

        // Show success
        showSuccess('הכלב הועלה בהצלחה! 🐶');

        // Reset form
        uploadForm.reset();
        hebrewWarning.style.display = 'none';
        optionalHebrewWarning.style.display = 'none';
        optionalFields.style.display = 'none';
        toggleDetailsBtn.textContent = '+ הוסף פרטים';

        // Reload dogs
        setTimeout(() => {
            loadAllDogs();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        showError(`Upload failed: ${error.message}`);
    } finally {
        hideLoading();
        loadingEl.textContent = 'Loading...';
    }
}

/**
 * Get full image URL (handles both Cloudinary URLs and local filenames)
 */
function getImageUrl(imageIdentifier) {
    // If it's already a full URL (Cloudinary), return as-is
    if (imageIdentifier.startsWith('http://') || imageIdentifier.startsWith('https://')) {
        return imageIdentifier;
    }
    // Otherwise, it's a local filename - prepend API base URL
    return `${API_BASE_URL}/uploads/${imageIdentifier}`;
}

/**
 * Get a random vibrant color for dog name banner
 */
function getRandomColor() {
    const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Light Salmon
        '#98D8C8', // Mint
        '#F7DC6F', // Yellow
        '#BB8FCE', // Purple
        '#85C1E2', // Sky Blue
        '#F8B88B', // Peach
        '#ABEBC6', // Light Green
        '#F06292', // Pink
        '#FFB74D', // Orange
        '#81C784', // Green
        '#64B5F6', // Light Blue
        '#BA68C8', // Violet
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Display results
 */
function displayResults(dogs) {
    resultsGrid.innerHTML = '';

    if (!dogs || dogs.length === 0) {
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No dogs found</p>';
        return;
    }

    dogs.forEach(dog => {
        const card = document.createElement('div');
        card.className = 'dog-card';

        const images = dog.images || [dog.image_path];
        const primaryImage = getImageUrl(images[0]);
        const date = formatDateDDMMYYYY(new Date(dog.created_at));

        let detailsHtml = '';
        if (dog.age || dog.adoption_date || dog.location || dog.city) {
            detailsHtml = '<div class="dog-details">';
            if (dog.age) detailsHtml += `<div>גיל: ${escapeHtml(dog.age)}</div>`;
            if (dog.adoption_date) {
                const adoptDate = formatDateDDMMYYYY(new Date(dog.adoption_date));
                detailsHtml += `<div>תאריך אימוץ: ${adoptDate}</div>`;
            }
            if (dog.location) detailsHtml += `<div>מאיפה אומץ: ${escapeHtml(dog.location)}</div>`;
            if (dog.city) detailsHtml += `<div>עיר מגורים: ${escapeHtml(dog.city)}</div>`;
            detailsHtml += '</div>';
        }

        // Build image container with hover effect if multiple images
        let imageHtml = '';
        if (images.length > 1) {
            imageHtml = `
                <div class="image-container">
                    <img src="${primaryImage}" alt="${escapeHtml(dog.name)}" loading="lazy" class="main-image" data-index="0">
                    <div class="image-gallery">
                        ${images.map((img, idx) => `
                            <img src="${getImageUrl(img)}" alt="${escapeHtml(dog.name)}" loading="lazy" data-index="${idx}">
                        `).join('')}
                    </div>
                    <div class="image-count">${images.length} תמונות</div>
                </div>
            `;
        } else {
            imageHtml = `<img src="${primaryImage}" alt="${escapeHtml(dog.name)}" loading="lazy" data-index="0">`;
        }

        // Get random color for name banner
        const bannerColor = getRandomColor();

        // Check if this dog was uploaded by current session
        const canDelete = isMyDog(dog.id);
        const deleteButton = canDelete ? `<button class="delete-btn" data-dog-id="${dog.id}" title="מחק כלב">🗑️</button>` : '';

        card.innerHTML = `
            ${deleteButton}
            ${imageHtml}
            <div class="dog-name-banner" style="background-color: ${bannerColor}">
                <span class="paw">🐾</span> ${escapeHtml(dog.name)} <span class="paw">🐾</span>
            </div>
        `;

        // Store dog data on card for modal
        card.dataset.dogData = JSON.stringify({
            name: dog.name,
            date: date,
            age: dog.age,
            adoption_date: dog.adoption_date,
            location: dog.location,
            city: dog.city
        });

        // Add click handlers to all images in the card
        card.querySelectorAll = card.querySelectorAll || document.querySelectorAll.bind(card);
        resultsGrid.appendChild(card);

        // Add delete button handler if present
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const dogId = parseInt(e.currentTarget.getAttribute('data-dog-id'));
                await deleteDog(dogId, dog.name);
            });
        }

        // Add click handler to card to show details
        card.addEventListener('click', (e) => {
            // Check if clicking on delete button
            if (e.target.classList.contains('delete-btn')) {
                e.stopPropagation();
                return;
            }
            // Check if clicking on image for lightbox
            if (e.target.tagName === 'IMG') {
                e.stopPropagation();
                const index = parseInt(e.target.getAttribute('data-index')) || 0;
                openLightbox(images, index);
            } else {
                // Otherwise show details modal
                showDetailsModal(card.dataset.dogData);
            }
        });

        card.style.cursor = 'pointer';
    });
}

/**
 * Delete a dog
 */
async function deleteDog(dogId, dogName) {
    // Confirm deletion
    const confirmed = confirm(`האם אתה בטוח שברצונך למחוק את ${dogName}? לא ניתן לבטל פעולה זו.`);
    if (!confirmed) return;

    try {
        showLoading();

        const response = await fetch(`${API_BASE_URL}/api/dogs/${dogId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete dog');
        }

        // Remove from localStorage
        removeUploadedDog(dogId);

        // Show success message
        showSuccess(`${dogName} נמחק בהצלחה`);

        // Reload dogs
        setTimeout(() => {
            loadAllDogs();
        }, 1000);

    } catch (error) {
        console.error('Error deleting dog:', error);
        showError(`Failed to delete dog: ${error.message}`);
    } finally {
        hideLoading();
    }
}

/**
 * Show loading
 */
function showLoading() {
    loadingEl.style.display = 'block';
}

/**
 * Hide loading
 */
function hideLoading() {
    loadingEl.style.display = 'none';
}

/**
 * Show error
 */
function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => hideError(), 5000);
}

/**
 * Hide error
 */
function hideError() {
    errorEl.style.display = 'none';
}

/**
 * Show success
 */
function showSuccess(message) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    setTimeout(() => {
        successEl.style.display = 'none';
    }, 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date as dd/mm/yyyy
 */
function formatDateDDMMYYYY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Open lightbox with image
 */
function openLightbox(images, startIndex) {
    currentImages = images;
    currentImageIndex = startIndex;
    showLightboxImage();
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

/**
 * Close lightbox
 */
function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Show current image in lightbox
 */
function showLightboxImage() {
    lightboxImage.src = getImageUrl(currentImages[currentImageIndex]);

    // Show/hide navigation buttons
    lightboxPrev.style.display = currentImages.length > 1 ? 'block' : 'none';
    lightboxNext.style.display = currentImages.length > 1 ? 'block' : 'none';
}

/**
 * Show previous image
 */
function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    showLightboxImage();
}

/**
 * Show next image
 */
function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    showLightboxImage();
}

/**
 * Show details modal
 */
function showDetailsModal(dogDataJson) {
    const dogData = JSON.parse(dogDataJson);

    let detailsHtml = `<h2>${escapeHtml(dogData.name)}</h2>`;

    if (dogData.date) {
        detailsHtml += `<div class="detail-item"><span class="detail-label">תאריך העלאה:</span> ${dogData.date}</div>`;
    }

    if (dogData.age) {
        detailsHtml += `<div class="detail-item"><span class="detail-label">גיל:</span> ${escapeHtml(dogData.age)}</div>`;
    }

    if (dogData.adoption_date) {
        const adoptDate = formatDateDDMMYYYY(new Date(dogData.adoption_date));
        detailsHtml += `<div class="detail-item"><span class="detail-label">תאריך אימוץ:</span> ${adoptDate}</div>`;
    }

    if (dogData.location) {
        detailsHtml += `<div class="detail-item"><span class="detail-label">מאיפה אומץ:</span> ${escapeHtml(dogData.location)}</div>`;
    }

    if (dogData.city) {
        detailsHtml += `<div class="detail-item"><span class="detail-label">עיר מגורים:</span> ${escapeHtml(dogData.city)}</div>`;
    }

    detailsModalBody.innerHTML = detailsHtml;
    detailsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Close details modal
 */
function closeDetailsModal() {
    detailsModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Lightbox event listeners
lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});
lightboxPrev.addEventListener('click', showPrevImage);
lightboxNext.addEventListener('click', showNextImage);

// Details modal event listeners
detailsModalClose.addEventListener('click', closeDetailsModal);
detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
        closeDetailsModal();
    }
});

// Keyboard navigation for lightbox and details modal
document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    }
    if (detailsModal.style.display === 'flex') {
        if (e.key === 'Escape') closeDetailsModal();
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

lightbox.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        showNextImage(); // Swipe left
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        showPrevImage(); // Swipe right
    }
}
