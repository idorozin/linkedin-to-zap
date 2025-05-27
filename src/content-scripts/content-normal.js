// Content script for extracting profile data from normal LinkedIn profile pages
// This script handles data extraction from standard LinkedIn profiles (linkedin.com/in/*)
console.log('Profile To Affinity: Normal LinkedIn content script loaded on:', window.location.href);

/**
 * Extracts work experience data from LinkedIn profile experience section
 * Handles both single-role and multi-role company experiences
 * @returns {Array} Array of experience objects with company and positions data
 */
function extractExperienceData() {
  try {
    // Find the experience section container
    const experienceSection = document.querySelector('[id="experience"]')?.nextElementSibling?.nextElementSibling;
    if (!experienceSection) return [];

    // Get all top-level experience entries
    const experienceEntries = experienceSection.querySelector('ul')?.querySelectorAll(':scope > li');
    if (!experienceEntries) return [];

    const experienceData = [];

    experienceEntries.forEach((experienceEntry) => {
      try {
        const topDiv = experienceEntry.querySelector('div');
        if (!topDiv) return;
        const dataContainer = topDiv.querySelectorAll(':scope > div')[1];
        if (!dataContainer) return;

        // Detect if this is a multi-role experience (same company, multiple positions)
        const rolesList = dataContainer.querySelector(':scope > div > ul');
        const roleItems = rolesList?.querySelectorAll(':scope > li');
        const isMultiRoleExperience = !!roleItems && [...roleItems].some(li => li.querySelector('.t-bold span'));

        const parsedExperience = isMultiRoleExperience ? 
          parseMultiRoleExperience(dataContainer) : 
          parseSingleRoleExperience(dataContainer);
          
        if (parsedExperience) experienceData.push(parsedExperience);
      } catch (e) {
        console.warn('Error parsing individual experience entry:', e);
      }
    });

    console.log('Extracted Experience Data:', experienceData);
    return experienceData;
  } catch (e) {
    console.error('Fatal error extracting experience data:', e);
    return [];
  }
}

/**
 * Parses a single role experience entry (one position at one company)
 * @param {Element} dataContainer - The DOM element containing the experience data
 * @returns {Object} Experience object with company and single position
 */
function parseSingleRoleExperience(dataContainer) {
  const experienceEntry = {};
  const position = {};

  // Extract job title
  const titleElement = dataContainer.querySelector('.t-bold span');
  if (titleElement) position.title = titleElement.innerText.trim();

  // Extract company name and employment type
  const companyAndTypeElement = dataContainer.querySelector('span.t-14.t-normal span');
  if (companyAndTypeElement) {
    const text = companyAndTypeElement.innerText.trim();
    const parts = text.split('·').map(part => part.trim());
    if (parts.length === 2) {
      experienceEntry.company = parts[0];
      position.employmentType = parts[1];
    } else if (parts.length === 1 && parts[0] !== position.title) {
      experienceEntry.company = parts[0];
    }
  }

  // Extract duration and location
  const metadataElements = dataContainer.querySelectorAll('span.t-14.t-normal.t-black--light span');
  if (metadataElements[0]) position.duration = metadataElements[0].innerText.trim();
  if (metadataElements[1]) position.location = metadataElements[1].innerText.trim();

  // Extract job description
  const descriptionElement = dataContainer.querySelector('.inline-show-more-text--is-collapsed') ||
                       dataContainer.querySelector('.pvs-entity__sub-components .inline-show-more-text--is-collapsed');
  if (descriptionElement) position.description = descriptionElement.innerText.trim();

  experienceEntry.positions = [position];
  return experienceEntry;
}

/**
 * Parses a multi-role experience entry (multiple positions at the same company)
 * @param {Element} dataContainer - The DOM element containing the experience data
 * @returns {Object} Experience object with company and multiple positions
 */
function parseMultiRoleExperience(dataContainer) {
  const experienceEntry = {};
  
  // Extract company name
  const companyElement = dataContainer.querySelector('a div span');
  if (companyElement) experienceEntry.company = companyElement.innerText.trim();

  // Extract total duration at company
  const totalDurationElement = dataContainer.querySelector('span.t-14.t-normal')?.innerText.trim();
  if (totalDurationElement) experienceEntry.totalDuration = totalDurationElement;

  // Extract individual role information
  const roleItems = dataContainer.querySelector(':scope > div > ul')?.querySelectorAll(':scope > li');
  if (!roleItems) return null;

  experienceEntry.positions = [];
  roleItems.forEach((roleItem) => {
    const position = {};
    const roleDataContainer = roleItem.querySelector('div')?.querySelectorAll(':scope > div')[1];
    if (!roleDataContainer) return;

    // Extract role title
    const roleTitleElement = roleDataContainer.querySelector('div span');
    if (roleTitleElement) position.title = roleTitleElement.innerText.trim();

    // Extract role duration
    const roleDurationElement = roleDataContainer.querySelector('span.t-black--light span');
    if (roleDurationElement) position.duration = roleDurationElement.innerText.trim();

    // Extract role description
    const roleDescriptionElement = roleItem.querySelector('.inline-show-more-text--is-collapsed');
    if (roleDescriptionElement) position.description = roleDescriptionElement.innerText.trim();

    experienceEntry.positions.push(position);
  });

  return experienceEntry;
}

/**
 * Extracts education data from LinkedIn profile education section
 * Handles both simple and complex education entries (with multiple degrees/programs)
 * @returns {Array} Array of education objects with university and program data
 */
function extractEducationData() {
  try {
    // Find the education section container
    const educationSection = document.querySelector('[id="education"]')?.nextElementSibling?.nextElementSibling;
    if (!educationSection) return []; // Return empty array if education section not found
    
    // Get all top-level education entries
    const educationEntries = educationSection.querySelector('ul')?.querySelectorAll(':scope > li');
    if (!educationEntries) return [];
    
    const educationData = [];

    educationEntries.forEach((educationEntry) => {
        try {
            const entry = {};
            const topDiv = educationEntry.querySelector('div');
            if (!topDiv) return;
            
            const logoContainer = topDiv.querySelectorAll(':scope > div')[0];
            const dataContainer = topDiv.querySelectorAll(':scope > div')[1];
            if (!dataContainer) return;
            
            // Check if this is a complex education entry (multiple programs/degrees)
            const programsList = dataContainer.querySelector('ul');
            const programCount = programsList ? programsList.querySelectorAll(':scope > li').length : 0;

            // Handle simple education entry (single degree/program)
            if (programCount == 0 || programCount == 1) {
                const detailsContainer = dataContainer.querySelector('div')?.querySelector('div');
                if (!detailsContainer) return;
                
                // Extract university name
                const universityElement = detailsContainer.querySelector('div')?.querySelector('span');
                if (universityElement) entry.university = universityElement.innerText; 
                
                // Extract subject/degree
                const subjectElements = detailsContainer.nextElementSibling?.querySelectorAll(':scope > span');
                if (subjectElements && subjectElements.length > 0) {
                  entry.subject = subjectElements[0].innerText; 
                }
                
                educationData.push(entry);
            } else {
              // Handle complex education entry (multiple programs at same institution)
              try{
                const universityDataContainer = dataContainer.querySelectorAll(':scope > div')[0];
                const programsDataContainer = dataContainer.querySelectorAll(':scope > div')[1];

                // Extract university name and main subject
                const universityElement = universityDataContainer?.querySelector('div')?.querySelector('span');
                const mainSubjectElement = universityDataContainer?.querySelector('a > span')?.querySelector('span');
                
                if (universityElement) entry.university = universityElement.innerText;
                if (mainSubjectElement) entry.subject = mainSubjectElement.innerText;
                entry.positions = []; // Use positions array for multiple programs

                // Extract individual programs/degrees
                const programItems = programsDataContainer?.querySelector('ul')?.querySelectorAll(':scope > li');
                if (programItems) {
                  programItems.forEach((programItem) => {
                      try {
                          const programDataContainer = programItem.querySelector('div')?.querySelectorAll(':scope > div')[1];
                          if (!programDataContainer) return;
                          
                          // Extract program title and duration
                          const programTitleElement = programDataContainer.querySelector('div')?.querySelector('span');
                          const programDurationElement = programDataContainer.querySelector('a > span')?.querySelector('span');
                          
                          const program = {};
                          if (programTitleElement) program.title = programTitleElement.innerText;
                          if (programDurationElement) program.duration = programDurationElement.innerText;
                          
                          entry.positions.push(program);
                      } catch (e) {
                          console.warn('Error parsing individual education program:', e);
                      }
                  });
                }

                educationData.push(entry);
              }
              catch(e){
                console.warn('Error parsing complex education entry, falling back to simple parsing:', e);
                // Fallback to simple parsing for complex entries that fail
                const detailsContainer = dataContainer.querySelector('div')?.querySelector('div');
                if (!detailsContainer) return;
                
                const universityElement = detailsContainer.querySelector('div')?.querySelector('span');
                if (universityElement) entry.university = universityElement.innerText;
                
                const subjectElements = detailsContainer.nextElementSibling?.querySelectorAll(':scope > span');
                if (subjectElements && subjectElements.length > 0) {
                  entry.subject = subjectElements[0].innerText; 
                }
                
                educationData.push(entry);
              }
            }
        } catch (e) {
            console.warn('Error parsing education entry:', e);
        }
    });

    return educationData;
  } catch (error) {
    console.error('Error extracting education data:', error);
    return [];
  }
}

/**
 * Extracts complete profile data from normal LinkedIn profile page
 * Combines personal info, experience, and education data
 * @param {Object} request - Request object containing form data from popup
 * @returns {Object} Complete profile data object ready for Zapier
 */
function extractCompleteProfileData(request){
  try {
    console.log("Extracting complete profile data from normal LinkedIn page");
    
    // Extract basic profile information
    const nameElement = document.querySelector('h1');
    const personName = nameElement ? nameElement.innerText.trim() : '';
    
    // Extract about section
    const aboutSection = document.querySelector('[id="about"]');
    const personBlurb = aboutSection?.nextElementSibling?.nextElementSibling?.innerText?.trim() || '';
    
    // Extract structured data
    const experienceData = extractExperienceData();
    const educationData = extractEducationData();
    
    console.log('Extracted experience data:', experienceData); 
    console.log('Extracted education data:', educationData);
    
    // Extract current job info from first experience entry
    const currentExperience = experienceData[0] || {};
    const currentCompany = currentExperience.company || '';
    const currentJobTitle = (currentExperience.positions && currentExperience.positions[0] && currentExperience.positions[0].title) || '';

    // Build complete profile data object
    const profileData = {
      list: request.formData.list,
      rating: request.formData.stars,
      notes: request.formData.notes,
      personBlurb,
      personName,
      email: '', // Email not available on normal LinkedIn profiles
      experience: experienceData,
      education: educationData,
      company: currentCompany,
      job: currentJobTitle,
      linkedinUrl: window.location.href,
    };
    
    return profileData;
  } catch (error) {
    console.error('Error in extractCompleteProfileData:', error);
    throw error;
  }
}

/**
 * Main message listener for handling requests from popup
 * Processes profile data extraction and Zapier webhook requests
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Normal content script received message:', request.action, 'on URL:', window.location.href);
  
  // Handle profile data preview requests
  if (request.action === "getProfileData") {
    try {
      const profileData = extractCompleteProfileData(request);
      console.log('Profile data extracted successfully:', profileData);
      sendResponse({ success: true, data: profileData });
    } catch (error) {
      console.error('Error extracting profile data:', error);
      sendResponse({ success: false, message: 'Failed to extract profile data: ' + error.message });
    }
    return true; // Keep message channel open for async response
  }
  
  // Handle Zapier webhook send requests
  if (request.action === "sendToZapier") {
      let profileData;

      try {
        profileData = extractCompleteProfileData(request);
        console.log('Profile data prepared for Zapier webhook:', profileData);
      } catch (error) {
        console.error('Error extracting profile data for Zapier:', error);
        sendResponse({ success: false, message: 'Profile data extraction failed: ' + error.message });
        return true; 
      }      
      
      console.log("Forwarding profile data to background script for Zapier webhook processing");
      
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
  