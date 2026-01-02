import { query } from './config/db.js';

/**
 * Test login API endpoint
 */

const testLogin = async () => {
    try {
        console.log('🧪 Testing Login API...\n');

        const testCases = [
            {
                name: 'Valid credentials - john.smith',
                username: 'john.smith',
                password: 'password123',
                shouldSucceed: true
            },
            {
                name: 'Invalid password',
                username: 'john.smith',
                password: 'wrongpassword',
                shouldSucceed: false
            },
            {
                name: 'Invalid username',
                username: 'nonexistent',
                password: 'password123',
                shouldSucceed: false
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n📋 Test: ${testCase.name}`);
            console.log(`   Username: ${testCase.username}`);
            console.log(`   Password: ${testCase.password}`);

            try {
                const response = await fetch('http://localhost:3001/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: testCase.username,
                        password: testCase.password
                    })
                });

                const data = await response.json();

                if (testCase.shouldSucceed) {
                    if (response.ok) {
                        console.log(`   ✅ SUCCESS: ${data.message}`);
                        console.log(`   👤 User: ${data.data.user.name}`);
                        console.log(`   🔑 Token: ${data.data.token.substring(0, 50)}...`);
                    } else {
                        console.log(`   ❌ FAILED: Expected success but got ${response.status}`);
                        console.log(`   Message: ${data.message}`);
                    }
                } else {
                    if (!response.ok) {
                        console.log(`   ✅ CORRECTLY REJECTED: ${data.message}`);
                    } else {
                        console.log(`   ❌ FAILED: Expected rejection but login succeeded`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ ERROR: ${error.message}`);
            }
        }

        console.log('\n✅ Login API tests complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testLogin();
