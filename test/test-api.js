#!/usr/bin/env node

/**
 * JWT Token Generation and Testing Script
 * Used for testing JWT authentication in Chainy production environment
 */

import jwt from 'jsonwebtoken';
import https from 'https';

// Configuration
const API_BASE_URL = process.env.CHAINY_API_ENDPOINT || 'https://your-api-gateway-url.amazonaws.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here'; // Need to get from AWS SSM

/**
 * Generate JWT Token
 */
function generateJWT() {
    const payload = {
        sub: 'test-user-123',  // JWT standard: subject (user ID)
        userId: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expires in 1 hour
    };

    try {
        const token = jwt.sign(payload, JWT_SECRET);
        console.log('✅ JWT Token generated successfully:');
        console.log(token);
        console.log('');
        return token;
    } catch (error) {
        console.error('❌ JWT Token generation failed:', error.message);
        return null;
    }
}

/**
 * Test API Endpoints
 */
function testAPI(token) {
    if (!token) {
        console.error('❌ No valid JWT Token');
        return;
    }

    console.log('🧪 Starting API endpoint testing...');
    console.log('');

    // Test data
    const testData = {
        url: 'https://example.com',
        code: 'test-' + Date.now()
    };

    // Test creating short link
    console.log('📝 Testing short link creation...');
    makeRequest('POST', '/links', testData, token)
        .then(response => {
            console.log('✅ Short link creation successful:', response);

            // Test getting short link
            console.log('📖 Testing short link retrieval...');
            return makeRequest('GET', `/links/${testData.code}`, null, token);
        })
        .then(response => {
            console.log('✅ Short link retrieval successful:', response);

            // Test redirect (no authentication required)
            console.log('🔄 Testing redirect...');
            return testRedirect(testData.code);
        })
        .then(response => {
            console.log('✅ Redirect test successful:', response);
            console.log('');
            console.log('🎉 All tests passed!');
        })
        .catch(error => {
            console.error('❌ Test failed:', error.message);
        });
}

/**
 * Test Redirect (No Authentication Required)
 */
function testRedirect(code) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE_URL}/${code}`;

        const options = {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Chainy-Test/1.0'
            }
        };

        const req = https.request(url, options, (res) => {
            console.log(`📍 Redirect status code: ${res.statusCode}`);
            console.log(`📍 Redirect target: ${res.headers.location || 'N/A'}`);
            resolve({
                statusCode: res.statusCode,
                location: res.headers.location
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

/**
 * Send HTTP Request
 */
function makeRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE_URL}${path}`;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    console.log(`📊 ${method} ${path} - Status code: ${res.statusCode}`);

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsedData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${parsedData.message || responseData}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Main Function
 */
function main() {
    console.log('🚀 Chainy Production Environment API Testing');
    console.log('=============================================');
    console.log('');

    // Check JWT secret
    if (JWT_SECRET === 'your-jwt-secret-here') {
        console.log('⚠️  Warning: Please set correct JWT_SECRET environment variable');
        console.log('   Get it with: aws ssm get-parameter --name "/chainy/prod/jwt-secret" --with-decryption');
        console.log('');
    }

    // Generate JWT token
    const token = generateJWT();

    if (token) {
        // Test API
        testAPI(token);
    }
}

// Run tests
main();

export {
    generateJWT,
    testAPI,
    testRedirect
};
