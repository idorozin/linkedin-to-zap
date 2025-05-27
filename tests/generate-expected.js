/**
 * Helper script to generate expected.json files from input.html files
 * Usage: node tests/generate-expected.js <test-case-name>
 * Supports both regular LinkedIn profiles (content-normal.js) and Sales Navigator (content-sales.js)
 * Test cases with 'sales' in the name will use content-sales.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Mock chrome runtime
global.chrome = {
  runtime: {
    onMessage: {
      addListener: () => {}
    },
    sendMessage: () => {},
    lastError: null
  }
};

/**
 * Detects which content script to use based on test case name
 * @param {string} testCaseName - The name of the test case directory
 * @returns {string} - Either 'content-normal.js' or 'content-sales.js'
 */
function detectContentScriptType(testCaseName) {
  // Test cases ending with '-sales' use the sales navigator content script
  const isSalesNavigator = testCaseName.toLowerCase().includes('-sales') || 
                          testCaseName.toLowerCase().includes('sales');
  
  return isSalesNavigator ? 'content-sales.js' : 'content-normal.js';
}

/**
 * Loads and prepares the appropriate content script
 * @param {string} scriptType - Either 'content-normal.js' or 'content-sales.js'
 * @returns {string} - The processed content script code
 */
function loadContentScript(scriptType) {
  const contentScriptPath = path.join(__dirname, '..', 'src', 'content-scripts', scriptType);
  const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf8');

  // Remove the chrome.runtime.onMessage.addListener part at the end
  // Find the start of the main message listener JSDoc comment
  const messageListenerStart = contentScriptCode.indexOf('/**\n * Main message listener');
  
  if (messageListenerStart !== -1) {
    // Keep everything before the message listener
    const functionsOnly = contentScriptCode.substring(0, messageListenerStart).trim();
    return functionsOnly;
  } else {
    // Fallback: remove everything after chrome.runtime.onMessage.addListener
    const functionsOnly = contentScriptCode
      .replace(/console\.log\('Profile To Affinity:.*?\);/, '') // Remove initial console.log
      .replace(/chrome\.runtime\.onMessage\.addListener[\s\S]*$/, ''); // Remove event listener
    return functionsOnly;
  }
}

function generateExpectedOutput(testCaseName) {
  const testCaseDir = path.join(__dirname, 'data', testCaseName);
  const inputFile = path.join(testCaseDir, 'input.html');
  const expectedFile = path.join(testCaseDir, 'expected.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  try {
    console.log(`🔄 Generating expected output for: ${testCaseName}`);
    
    // Detect which content script to use
    const scriptType = detectContentScriptType(testCaseName);
    console.log(`📄 Using content script: ${scriptType}`);
    
    // Load the appropriate content script
    const functionsOnly = loadContentScript(scriptType);
    
    // Debug: log the extracted functions to see what we got
    console.log(`📝 Extracted ${functionsOnly.length} characters of function code`);
    
    // Load the HTML file
    const htmlContent = fs.readFileSync(inputFile, 'utf8');
    
    // Create JSDOM instance with appropriate URL based on script type
    const baseUrl = scriptType === 'content-sales.js' 
      ? 'https://www.linkedin.com/sales/lead/test-profile/'
      : 'https://www.linkedin.com/in/test-profile/';
      
    const dom = new JSDOM(htmlContent, {
      url: baseUrl,
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'outside-only'
    });

    const document = dom.window.document;
    const window = dom.window;

    // Set up globals
    global.document = document;
    global.window = window;

    // Add innerText polyfill for JSDOM
    Object.defineProperty(window.Element.prototype, 'innerText', {
      get() {
        return this.textContent;
      },
      set(value) {
        this.textContent = value;
      }
    });

    // Execute the content script functions
    eval(functionsOnly);

    // Extract profile data using the refactored function names
    const mockRequest = {
      formData: {
        list: '',
        stars: '',
        notes: ''
      }
    };
    
    // Call the appropriate function based on script type (using new refactored names)
    let profileData;
    if (scriptType === 'content-sales.js') {
      profileData = extractSalesNavigatorProfileData(mockRequest);
    } else {
      profileData = extractCompleteProfileData(mockRequest);
    }
    
    // Extract only the fields we want to test
    const expectedResult = {
      personName: profileData.personName,
      personBlurb: profileData.personBlurb,
      experience: profileData.experience,
      education: profileData.education,
      company: profileData.company,
      job: profileData.job,
      linkedinUrl: profileData.linkedinUrl
    };

    // Write expected output
    fs.writeFileSync(expectedFile, JSON.stringify(expectedResult, null, 2));
    
    console.log(`✅ Expected output generated: ${expectedFile}`);
    console.log('\nGenerated data:');
    console.log(JSON.stringify(expectedResult, null, 2));
    
    // Clean up
    dom.window.close();
    
  } catch (error) {
    console.error(`❌ Error generating expected output: ${error.message}`);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Main execution
const testCaseName = process.argv[2];

if (!testCaseName) {
  console.log('Usage: node tests/generate-expected.js <test-case-name>');
  console.log('\nExample: node tests/generate-expected.js amit-sabag-test');
  console.log('Example: node tests/generate-expected.js david-bleicher-sales-test');
  console.log('\nNote: Test cases with "sales" in the name will use content-sales.js');
  process.exit(1);
}

generateExpectedOutput(testCaseName); 