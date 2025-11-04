// Lambda handler wrapper for Express application
const awsServerlessExpress = require('@vendia/serverless-express');
const app = require('./index');

// Initialize serverless-express outside the handler for better performance
// This is created once when the Lambda container is initialized
const serverlessExpress = awsServerlessExpress({ app });

exports.handler = async (event, context) => {
    // Enable callbackWaitsForEmptyEventLoop for better Lambda performance
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        // Call the serverless-express handler
        return await serverlessExpress(event, context);
    } catch (error) {
        console.error('Lambda handler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                message: error.message 
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
