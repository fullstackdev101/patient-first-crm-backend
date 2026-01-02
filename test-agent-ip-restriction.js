/**
 * Test script to verify Agent IP restriction
 * Tests multiple scenarios for Agent and Non-Agent users
 */

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to test login
async function testLogin(username, password, testName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${testName}`);
    console.log('='.repeat(60));

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log(`Success: ${data.success}`);
        console.log(`Message: ${data.message}`);
        if (data.errorType) {
            console.log(`Error Type: ${data.errorType}`);
        }
        if (data.details) {
            console.log(`Details:`, data.details);
        }

        if (data.success) {
            console.log(`✅ TEST PASSED: Login successful`);
        } else {
            console.log(`❌ TEST RESULT: Login blocked - ${data.message}`);
        }

        return { success: response.ok, data };
    } catch (error) {
        console.log(`❌ TEST FAILED: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n🧪 AGENT IP RESTRICTION TEST SUITE');
    console.log('Testing role-based IP validation\n');

    // Test 1: Agent without assigned IP (sarah.johnson)
    await testLogin(
        'sarah.johnson',
        'password123',
        'Agent Login Without Assigned IP (Should Fail)'
    );

    // Test 2: Agent with assigned IP (mike.davis)
    // Note: This will fail if login IP doesn't match assigned IP (154.192.3.3)
    await testLogin(
        'mike.davis',
        'password123',
        'Agent Login With Assigned IP (Will check IP match)'
    );

    // Test 3: Non-Agent without assigned IP (admin)
    await testLogin(
        'admin',
        'admin123',
        'Non-Agent Login Without Assigned IP (Should Succeed)'
    );

    // Test 4: Non-Agent with assigned IP (john.smith)
    // Note: This will check IP if assigned
    await testLogin(
        'john.smith',
        'password123',
        'Non-Agent Login With Assigned IP (Will check IP match)'
    );

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUITE COMPLETED');
    console.log('='.repeat(60));
    console.log('\n📋 EXPECTED RESULTS:');
    console.log('1. sarah.johnson (Agent, no IP): Should FAIL with IP_NOT_ASSIGNED');
    console.log('2. mike.davis (Agent, has IP): Should FAIL/PASS based on IP match');
    console.log('3. admin (Non-Agent, no IP): Should PASS');
    console.log('4. john.smith (Non-Agent, has IP): Should FAIL/PASS based on IP match');
    console.log('\n💡 Check backend console for detailed IP logging');
}

// Run tests
runTests().catch(console.error);
