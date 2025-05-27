/**
 * Clean test that uses the actual content script functions to extract LinkedIn profile data
 * Reads test cases from data directory with input.html and expected.json files
 * Supports both regular LinkedIn profiles (content-normal.js) and Sales Navigator (content-sales.js)
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

/**
 * Discovers all test cases in the data directory
 * Each test case should be a directory containing input.html and expected.json
 */
function discoverTestCases() {
  const dataDir = path.join(__dirname, 'data');
  const testCases = [];
  
  if (!fs.existsSync(dataDir)) {
    console.log('❌ Data directory not found:', dataDir);
    return testCases;
  }
  
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const testCaseDir = path.join(dataDir, entry.name);
      const inputFile = path.join(testCaseDir, 'input.html');
      const expectedFile = path.join(testCaseDir, 'expected.json');
      
      if (fs.existsSync(inputFile) && fs.existsSync(expectedFile)) {
        testCases.push({
          name: entry.name,
          inputFile,
          expectedFile
        });
      } else {
        console.log(`⚠️  Skipping ${entry.name}: missing input.html or expected.json`);
      }
    }
  }
  
  return testCases;
}

/**
 * Runs a single test case
 */
function runTestCase(testCase) {
  console.log(`\n🧪 Running test case: ${testCase.name}`);
  
  try {
    // Load the HTML file
    const htmlContent = fs.readFileSync(testCase.inputFile, 'utf8');
    
    // Detect which content script to use
    const scriptType = detectContentScriptType(testCase.name);
    console.log(`📄 Detected content script type: ${scriptType}`);
    
    // Load the appropriate content script
    const functionsOnly = loadContentScript(scriptType);
    
    // Debug: log the extracted functions to see what we got
    console.log(`📝 Extracted ${functionsOnly.length} characters of function code`);
    
    // Load expected result
    const expectedResult = JSON.parse(fs.readFileSync(testCase.expectedFile, 'utf8'));
    
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

    // Execute the content script functions in our context
    eval(functionsOnly);

    // Extract profile data using the actual content script functions with refactored names
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
    
    // Extract only the fields we want to test (remove the form data fields)
    const actualResult = {
      personName: profileData.personName,
      personBlurb: profileData.personBlurb,
      experience: profileData.experience,
      education: profileData.education,
      company: profileData.company,
      job: profileData.job,
      linkedinUrl: profileData.linkedinUrl
    };

    // Deep comparison
    const isEqual = JSON.stringify(actualResult) === JSON.stringify(expectedResult);
    
    if (isEqual) {
      console.log(`✅ ${testCase.name}: PASSED`);
      return { passed: true, testCase: testCase.name };
    } else {
      console.log(`❌ ${testCase.name}: FAILED`);
      console.log('\nExpected:');
      console.log(JSON.stringify(expectedResult, null, 2));
      console.log('\nActual:');
      console.log(JSON.stringify(actualResult, null, 2));
      
      // Show detailed differences for debugging
      console.log('\n🔍 Detailed differences:');
      for (const key in expectedResult) {
        if (JSON.stringify(actualResult[key]) !== JSON.stringify(expectedResult[key])) {
          console.log(`  ${key}:`);
          console.log(`    Expected: ${JSON.stringify(expectedResult[key])}`);
          console.log(`    Actual:   ${JSON.stringify(actualResult[key])}`);
        }
      }
      
      return { passed: false, testCase: testCase.name };
    }
    
  } catch (error) {
    console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
    console.log('Stack trace:', error.stack);
    return { passed: false, testCase: testCase.name, error: error.message };
  }
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('🚀 Discovering and running LinkedIn profile extraction tests...\n');
  
  const testCases = discoverTestCases();
  
  if (testCases.length === 0) {
    console.log('❌ No test cases found in data directory');
    return false;
  }
  
  console.log(`Found ${testCases.length} test case(s):`);
  testCases.forEach(tc => console.log(`  - ${tc.name}`));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = runTestCase(testCase);
    results.push(result);
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testCase}${r.error ? ` (${r.error})` : ''}`);
    });
  }
  
  return failed === 0;
}

// Run all tests
const allTestsPassed = runAllTests();

// Exit with appropriate code
process.exit(allTestsPassed ? 0 : 1);