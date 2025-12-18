const fs = require('fs');
const path = require('path');

/**
 * Upload file to S3 (or local filesystem for development)
 * @param {string} key - The file path/key
 * @param {Buffer} binaryData - The file data as a Buffer
 * @returns {Promise<string>} - The URL of the uploaded file
 */
const uploadToS3 = async (key, binaryData) => {
  try {
    // For development: save to local filesystem
    // For production: replace this with actual S3 upload logic
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create subdirectories based on key path
    const keyParts = key.split('/');
    const fileName = keyParts.pop();
    const subDir = keyParts.join('/');
    
    if (subDir) {
      const fullSubDir = path.join(uploadsDir, subDir);
      if (!fs.existsSync(fullSubDir)) {
        fs.mkdirSync(fullSubDir, { recursive: true });
      }
    }
    
    // Save file to local filesystem
    const filePath = path.join(uploadsDir, key);
    fs.writeFileSync(filePath, binaryData);
    
    // Return a URL path (adjust this based on your server setup)
    // For development, return a relative path that can be served statically
    return `/uploads/${key}`;
    
    // For production with actual S3, uncomment and configure:
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: binaryData,
      ContentType: 'image/jpeg', // Adjust based on file type
      ACL: 'public-read' // or 'private' based on your needs
    };
    
    const result = await s3.upload(params).promise();
    return result.Location;
    */
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

module.exports = {
  uploadToS3
};
