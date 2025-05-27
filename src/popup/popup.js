/**
 * Main class for managing the Profile To Affinity browser extension popup
 * Handles user interactions, form validation, data preview, and Zapier webhook integration
 */
class ProfileToAffinityPopup {
    constructor() {
        this.currentStarRating = 0;
        this.isProcessingRequest = false;
        this.initializeEventListeners();
        this.updateRatingDisplayText();
    }

    /**
     * Sets up all event listeners for popup interactions
     * Includes star rating, buttons, and form validation
     */
    initializeEventListeners() {
        // Star rating functionality
        const starElements = document.querySelectorAll('.star');
        starElements.forEach((star, index) => {
            star.addEventListener('click', () => this.setStarRating(index + 1));
            star.addEventListener('mouseenter', () => this.highlightStarsUpTo(index + 1));
            star.addEventListener('mouseleave', () => this.highlightStarsUpTo(this.currentStarRating));
        });

        // Button event listeners
        document.getElementById('zapier').addEventListener('click', () => this.sendProfileDataToZapier());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewProfileData());

        // Form validation triggers
        document.getElementById('list').addEventListener('change', () => this.validateFormInputs());
        document.getElementById('notes').addEventListener('input', () => this.validateFormInputs());
    }

    /**
     * Sets the current star rating and updates the UI
     * @param {number} rating - Rating value from 1-5
     */
    setStarRating(rating) {
        this.currentStarRating = rating;
        this.highlightStarsUpTo(rating);
        this.updateRatingDisplayText();
        this.validateFormInputs();
    }

    /**
     * Highlights stars up to the specified count
     * @param {number} count - Number of stars to highlight
     */
    highlightStarsUpTo(count) {
        const starElements = document.querySelectorAll('.star');
        starElements.forEach((star, index) => {
            if (index < count) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
    }

    /**
     * Updates the rating text display based on current rating
     */
    updateRatingDisplayText() {
        const ratingTextElement = document.getElementById('ratingText');
        const ratingLabels = ['Click to rate', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        ratingTextElement.textContent = ratingLabels[this.currentStarRating] || 'Click to rate';
    }

    /**
     * Validates form inputs and enables/disables the send button
     * Requires both list selection and star rating
     */
    validateFormInputs() {
        const selectedList = document.getElementById('list').value;
        const hasValidRating = this.currentStarRating > 0;
        const sendButton = document.getElementById('zapier');
        
        if (selectedList && hasValidRating) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
    }

    /**
     * Displays result message to user with success or error styling
     * @param {string} message - Message to display
     * @param {boolean} isSuccess - Whether this is a success or error message
     */
    showResultMessage(message, isSuccess = true) {
        const resultElement = document.getElementById('result');
        const resultTextElement = document.getElementById('resultText');
        const iconElement = resultElement.querySelector('i');
        
        resultElement.className = `result ${isSuccess ? 'success' : 'error'}`;
        iconElement.className = isSuccess ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        resultTextElement.textContent = message;
        resultElement.style.display = 'flex';
        
        // Auto-hide result message after 5 seconds
        setTimeout(() => {
            resultElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Sets the loading state for the send button
     * @param {boolean} isLoading - Whether to show loading state
     */
    setLoadingState(isLoading) {
        this.isProcessingRequest = isLoading;
        const sendButton = document.getElementById('zapier');
        const normalTextElement = sendButton.querySelector('.normal-text');
        const loadingTextElement = sendButton.querySelector('.loading');
        
        if (isLoading) {
            normalTextElement.style.display = 'none';
            loadingTextElement.style.display = 'flex';
            sendButton.disabled = true;
        } else {
            normalTextElement.style.display = 'flex';
            loadingTextElement.style.display = 'none';
            this.validateFormInputs();
        }
    }

    /**
     * Collects form data from popup inputs
     * @returns {Object} Form data object with list, rating, and notes
     */
    collectFormData() {
        const selectedList = document.getElementById('list').value;
        const notesText = document.getElementById('notes').value || '';
        
        return {
            list: selectedList,
            stars: this.currentStarRating,
            notes: notesText
        };
    }

    /**
     * Validates that current page is a LinkedIn profile page
     * @param {string} currentUrl - The current tab URL
     * @returns {Object} Validation result with isValid flag and message
     */
    validateLinkedInProfilePage(currentUrl) {
        // Check if we're on LinkedIn domain
        if (!currentUrl.includes('linkedin.com')) {
            return {
                isValid: false,
                message: 'Please navigate to a LinkedIn profile page'
            };
        }

        // Check for specific LinkedIn profile URL patterns
        const isLinkedInProfile = currentUrl.includes('/in/') || 
                                currentUrl.includes('/sales/lead/') || 
                                currentUrl.includes('/sales/people/');
        
        if (!isLinkedInProfile) {
            return {
                isValid: false,
                message: 'Please navigate to a LinkedIn profile page (not feed, search, or company page)'
            };
        }

        return { isValid: true };
    }

    /**
     * Sends message to content script and handles response
     * @param {Object} activeTab - The active browser tab
     * @param {string} action - Action to send to content script
     * @param {Object} formData - Form data to include in message
     * @returns {Promise} Promise resolving to content script response
     */
    async sendMessageToContentScript(activeTab, action, formData) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(activeTab.id, {
                action: action,
                formData: formData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Previews profile data without sending to Zapier
     * Extracts and displays profile information for user review
     */
    async previewProfileData() {
        try {
            const formData = this.collectFormData();
            
            // Get current active tab
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (!tabs[0]) {
                this.showResultMessage('No active tab found', false);
                return;
            }

            const currentUrl = tabs[0].url;
            console.log('Current URL for preview:', currentUrl);

            // Validate LinkedIn profile page
            const validation = this.validateLinkedInProfilePage(currentUrl);
            if (!validation.isValid) {
                this.showResultMessage(validation.message, false);
                return;
            }

            console.log('Sending profile data request to content script...');

            // Request profile data from content script
            const response = await this.sendMessageToContentScript(tabs[0], "getProfileData", formData);

            if (response && response.success) {
                this.displayProfileDataPreview(response.data);
            } else {
                this.showResultMessage(response?.message || 'Failed to extract profile data', false);
            }
        } catch (error) {
            console.error('Profile preview error:', error);
            if (error.message.includes('Could not establish connection')) {
                this.showResultMessage('Content script not loaded. Please refresh the LinkedIn page and try again.', false);
            } else {
                this.showResultMessage('Error previewing data: ' + error.message, false);
            }
        }
    }

    /**
     * Displays extracted profile data in the preview section
     * @param {Object} profileData - The extracted profile data
     */
    displayProfileDataPreview(profileData) {
        const previewSection = document.getElementById('previewSection');
        const previewDataElement = document.getElementById('previewData');
        
        // Format profile data for display
        const formattedProfileData = {
            'Name': profileData.personName || 'Not found',
            'Job Title': profileData.job || 'Not found',
            'Company': profileData.company || 'Not found',
            'List': profileData.list || 'Not selected',
            'Rating': '★'.repeat(profileData.rating || 0) + '☆'.repeat(5 - (profileData.rating || 0)),
            'Notes': profileData.notes || 'No notes',
            'Experience Count': profileData.experience?.length || 0,
            'Education Count': profileData.education?.length || 0,
            'LinkedIn URL': profileData.linkedinUrl || window.location.href
        };

        // Generate HTML for preview display
        previewDataElement.innerHTML = Object.entries(formattedProfileData)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
        
        previewSection.style.display = 'block';
    }

    /**
     * Sends profile data to Zapier webhook via background script
     * Main function for processing and sending profile data
     */
    async sendProfileDataToZapier() {
        if (this.isProcessingRequest) return;
        
        try {
            this.setLoadingState(true);
            const formData = this.collectFormData();
            
            // Validate required form fields
            if (!formData.list) {
                this.showResultMessage('Please select an Affinity list', false);
                return;
            }
            
            if (!formData.stars) {
                this.showResultMessage('Please provide a rating', false);
                return;
            }

            // Get current active tab
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (!tabs[0]) {
                this.showResultMessage('No active tab found', false);
                return;
            }

            const currentUrl = tabs[0].url;
            console.log('Current URL for Zapier send:', currentUrl);

            // Validate LinkedIn profile page
            const validation = this.validateLinkedInProfilePage(currentUrl);
            if (!validation.isValid) {
                this.showResultMessage(validation.message, false);
                return;
            }

            console.log('Sending Zapier request to content script...');

            // Send profile data to Zapier via content script
            const response = await this.sendMessageToContentScript(tabs[0], "sendToZapier", formData);

            if (response && response.success) {
                this.showResultMessage(response.message || 'Successfully sent to Zapier!', true);
                
                // Clear form after successful send (except for list selection)
                this.setStarRating(0);
                document.getElementById('notes').value = '';
                document.getElementById('previewSection').style.display = 'none';
            } else {
                this.showResultMessage(response?.message || 'Failed to send data to Zapier', false);
            }
        } catch (error) {
            console.error('Zapier send error:', error);
            if (error.message.includes('Could not establish connection')) {
                this.showResultMessage('Content script not loaded. Please refresh the LinkedIn page and try again.', false);
            } else {
                this.showResultMessage('Error sending data: ' + error.message, false);
            }
        } finally {
            this.setLoadingState(false);
        }
    }
}

// Initialize the popup application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileToAffinityPopup();
});

// Global error handling for the extension
window.addEventListener('error', (event) => {
    console.error('Extension popup error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in popup:', event.reason);
});
