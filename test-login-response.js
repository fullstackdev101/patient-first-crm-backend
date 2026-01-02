import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testLogin() {
    try {
        console.log('Testing login endpoint...');

        const response = await axios.post(`${API_URL}/auth/login`, {
            username: 'john.smith',
            password: 'password123'
        });

        console.log('✅ Login Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Check structure
        if (response.data.success && response.data.data && response.data.data.user && response.data.data.token) {
            console.log('✅ Response structure is correct!');
            console.log('User:', response.data.data.user.name);
            console.log('Token:', response.data.data.token.substring(0, 20) + '...');
        } else {
            console.log('❌ Response structure is incorrect!');
            console.log('Expected: { success, data: { user, token } }');
        }

    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
    }
}

testLogin();
