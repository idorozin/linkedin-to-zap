// Content script for extracting profile data from LinkedIn Sales Navigator pages
// This script handles data extraction from Sales Navigator profiles (linkedin.com/sales/*)
console.log('Profile To Affinity: Sales Navigator content script loaded on:', window.location.href);

/**
 * Extracts complete profile data from LinkedIn Sales Navigator profile page
 * Combines personal info, experience, and education data using Sales Navigator selectors
 * @param {Object} request - Request object containing form data from popup
 * @returns {Object} Complete profile data object ready for Zapier
 */
function extractSalesNavigatorProfileData(request) {
  // Initialize the profile data object with form data
  const profileData = {
    list: request.formData.list,
    rating: request.formData.stars,
    notes: request.formData.notes,
    personName: '',
    job: '',
    company: '',
    email: '',
    personBlurb: '',
    linkedinUrl: window.location.href,
    experience: [],
    education: []
  };
  
  try {
    console.log("Extracting complete profile data from LinkedIn Sales Navigator");
    
    // Extract basic profile information using Sales Navigator data attributes
    const personNameElement = document.querySelector('[data-anonymize="person-name"]');
    profileData.personName = personNameElement ? personNameElement.textContent.trim() : '';

    const jobTitleElement = document.querySelector('[data-anonymize="job-title"]');
    profileData.job = jobTitleElement ? jobTitleElement.textContent.trim() : '';

    const companyNameElement = document.querySelector('[data-anonymize="company-name"]');
    profileData.company = companyNameElement ? companyNameElement.textContent.trim() : '';

    const emailElement = document.querySelector('[data-anonymize="email"]');
    profileData.email = emailElement ? emailElement.textContent.trim() : '';

    const personBlurbElement = document.querySelector('[data-anonymize="person-blurb"]');
    profileData.personBlurb = personBlurbElement ? personBlurbElement.textContent.trim() : '';

    // Extract work experience data
    profileData.experience = extractSalesNavigatorExperienceData();

    // Extract education data
    profileData.education = extractSalesNavigatorEducationData();

    console.log('Extracted Sales Navigator profile data:', profileData);
    return profileData;
    
  } catch (error) {
    console.error('Error extracting Sales Navigator profile data:', error);
    throw error;
  }
}

/**
 * Extracts work experience data from Sales Navigator experience section
 * @returns {Array} Array of experience objects with company and positions data
 */
function extractSalesNavigatorExperienceData() {
  const experienceData = [];
  
  try {
    // Find all experience entries using Sales Navigator specific selectors
    const experienceEntries = document.querySelectorAll('._experience-entry_1irc72');

    experienceEntries.forEach(experienceEntry => {
      try {
        // Extract company name from the experience entry
        const companyNameElement = experienceEntry.querySelector('[data-anonymize="company-name"]');
        const companyName = companyNameElement ? companyNameElement.innerText.trim() : '';
        
        // Extract all job titles and durations for this company
        const jobTitleElements = experienceEntry.querySelectorAll('[data-anonymize="job-title"]');
        const durationElements = experienceEntry.querySelectorAll('.duration');  // Adjust selector if different
        
        const positions = [];

        // Process each job title and corresponding duration
        jobTitleElements.forEach((jobTitleElement, index) => {
          try {
            const jobTitle = jobTitleElement ? jobTitleElement.innerText.trim() : '';
            const duration = durationElements[index] ? durationElements[index].innerText.trim() : '';

            // Only add position if we have meaningful data
            if (jobTitle || duration) {
              positions.push({
                title: jobTitle,
                duration: duration
              });
            }
          } catch (e) {
            console.warn('Error parsing individual job title/duration:', e);
          }
        });

        // Only add experience entry if we have company name or positions
        if (companyName || positions.length) {
          experienceData.push({
            company: companyName,
            positions: positions
          });
        }
      } catch (e) {
        console.warn('Error parsing individual experience entry:', e);
      }
    });

    console.log('Extracted Sales Navigator experience data:', experienceData);
    return experienceData;
  } catch (error) {
    console.error('Error extracting Sales Navigator experience data:', error);
    return [];
  }
}

/**
 * Extracts education data from Sales Navigator education section
 * @returns {Array} Array of education objects with university and program data
 */
function extractSalesNavigatorEducationData() {
  const educationData = [];
  
  try {
    // Find all education entries by school name elements
    const schoolNameElements = document.querySelectorAll('h3[data-anonymize="education-name"]');

    schoolNameElements.forEach(schoolNameElement => {
      try {
        // Find the parent list item containing all education details
        const educationEntry = schoolNameElement.closest('li');
        if (!educationEntry) return;
        
        // Initialize variables for degree and field of study
        let degree = '';
        let fieldOfStudy = '';

        // Search through all paragraphs in the entry to find degree and field information
        const paragraphs = educationEntry.querySelectorAll('p');
        paragraphs.forEach(paragraph => {
          try {
            const headingElements = paragraph.querySelectorAll('h4');

            headingElements.forEach(headingElement => {
              try {
                const headingText = headingElement.textContent;
                
                // Extract degree name
                if (headingText.includes('Degree name')) {
                  const degreeElement = headingElement.nextElementSibling;
                  if (degreeElement) {
                    degree = degreeElement.textContent.trim();
                  }
                } 
                // Extract field of study
                else if (headingText.includes('Field of study')) {
                  const fieldOfStudyElement = headingElement.nextElementSibling;
                  if (fieldOfStudyElement) {
                    fieldOfStudy = fieldOfStudyElement.textContent.trim();
                  }
                }
              } catch (e) {
                console.warn('Error parsing education heading element:', e);
              }
            });
          } catch (e) {
            console.warn('Error parsing education paragraph:', e);
          }
        });

        // Extract education dates using specific Sales Navigator selector
        const datesElement = educationEntry.querySelector('p._bodyText_1e5nen._default_1i6ulk._sizeXSmall_1e5nen._lowEmphasis_1i6ulk > span + span');
        const dates = datesElement ? datesElement.textContent.trim() : '';

        // Extract school name
        const schoolName = schoolNameElement ? schoolNameElement.textContent.trim() : '';

        // Add education entry if we have meaningful data
        if (schoolName || degree || fieldOfStudy || dates) {
          educationData.push({
            university: schoolName,
            subject: degree,
            fieldOfStudy: fieldOfStudy,
            dates: dates
          });
        }
      } catch (e) {
        console.warn('Error parsing individual education entry:', e);
      }
    });

    console.log('Extracted Sales Navigator education data:', educationData);
    return educationData;
  } catch (error) {
    console.error('Error extracting Sales Navigator education data:', error);
    return [];
  }
}

/**
 * Main message listener for handling requests from popup
 * Processes profile data extraction and Zapier webhook requests for Sales Navigator
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Sales Navigator content script received message:', request.action, 'on URL:', window.location.href);
  
  // Handle profile data preview requests
  if (request.action === "getProfileData") {
    try {
      const profileData = extractSalesNavigatorProfileData(request);
      console.log('Sales Navigator profile data extracted successfully:', profileData);
      sendResponse({ success: true, data: profileData });
    } catch (error) {
      console.error('Error extracting Sales Navigator profile data:', error);
      sendResponse({ success: false, message: 'Failed to extract profile data: ' + error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  // Handle Zapier webhook send requests
  if (request.action === "sendToZapier") {
    let profileData;
    
    try {
      profileData = extractSalesNavigatorProfileData(request);
      console.log('Sales Navigator profile data prepared for Zapier webhook:', profileData);
    } catch (error) {
      console.error('Error extracting Sales Navigator profile data for Zapier:', error);
      sendResponse({ success: false, message: 'Profile data extraction failed: ' + error.message });
      return true; 
    }  
    
    console.log("Forwarding Sales Navigator profile data to background script for Zapier webhook processing");
    
    // Forward data to background script for webhook handling
    chrome.runtime.sendMessage({
      action: "sendToZapier",
      profileData: profileData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error communicating with background script:', chrome.runtime.lastError);
        sendResponse({ 
          success: false, 
          message: 'Failed to communicate with background script: ' + chrome.runtime.lastError.message 
        });
      } else {
        console.log('Background script response:', response);
        sendResponse(response);
      }
    });

    return true; // Keep message channel open for async response
  }
});
