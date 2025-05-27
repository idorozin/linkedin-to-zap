// Background service worker for handling Zapier webhook requests
// This script manages communication between content scripts and external Zapier webhooks
// Import configuration
importScripts('../config/config.js');

console.log('Profile To Affinity: Background service worker loaded');

/**
 * Main message listener for handling requests from content scripts
 * Processes profile data and forwards it to Zapier webhooks
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === "sendToZapier") {
    processZapierWebhookRequest(request.profileData, sendResponse);
    return true; // Keep message channel open for async response
  }
});

/**
 * Processes profile data and sends it to the configured Zapier webhook
 * Handles test mode detection and error scenarios
 * @param {Object} profileData - The extracted LinkedIn profile data
 * @param {Function} sendResponse - Callback function to send response back to content script
 */
async function processZapierWebhookRequest(profileData, sendResponse) {
  try {
    console.log('Background: Processing profile data for Zapier webhook:', profileData);
    
    // Use webhook URL from configuration
    const zapierWebhookUrl = CONFIG.ZAPIER_WEBHOOK_URL;
    
    // Handle test mode - don't send actual webhook request
    if (profileData.list === "Test") {
      console.log('Background: Test mode detected - skipping Zapier webhook call');
      console.log('Test profile data:', profileData);
      sendResponse({ 
        success: true, 
        message: 'Test mode: Profile data processed successfully without sending to Zapier' 
      });
      return;
    }
    
    // Send profile data to Zapier webhook
    // Dont provide headers as CORS is not allowed
    const webhookResponse = await fetch(zapierWebhookUrl, {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
    
    // Handle successful webhook response
    if (webhookResponse.ok) {
      console.log('Background: Profile data successfully sent to Zapier webhook');
      const responseData = await webhookResponse.json();
      console.log('Background: Zapier webhook response:', responseData);
      
      sendResponse({ 
        success: true, 
        message: 'Profile data successfully sent to Zapier webhook' 
      });
    } else {
      // Handle HTTP error responses
      console.error('Background: Zapier webhook request failed with status:', webhookResponse.status);
      sendResponse({ 
        success: false, 
        message: `Failed to send data to Zapier webhook (HTTP ${webhookResponse.status})` 
      });
    }
  } catch (error) {
    // Handle network errors and other exceptions
    console.error('Background: Error sending profile data to Zapier webhook:', error);
    sendResponse({ 
      success: false, 
      message: 'Network error when sending data to Zapier webhook: ' + error.message 
    });
  }
} 