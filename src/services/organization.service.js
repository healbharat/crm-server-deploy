// /services/organizationService.js
const httpStatus = require('http-status');
const Organization = require('../models/organization.model');
const ApiError = require('../utils/ApiError');
// const { uploadToS3 } = require('../utils/s3bucket');
const { User } = require('../models');

const createOrganization = async (organizationData) => {
  const { organizationName } = organizationData;
  // Check if the organization already exists
  const existOrg = await Organization.findOne({ organizationName });
  if (existOrg) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Organization already exist');
  }
  if (await User.isEmailTaken(organizationData.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (organizationData.organizationLogo && organizationData.organizationLogo !== '') {
    const base64String = organizationData.organizationLogo;
    const binaryData = Buffer.from(base64String, 'base64');
    const timestamp = Date.now();
    const key = `organization_logo/${organizationData.organizationName}_${timestamp}.jpg`;
    // const photoUrl = await uploadToS3(key, binaryData);
    // organizationData.organizationLogo = photoUrl;
  }
  const organization = await Organization.create(organizationData);
  organization.orgId = organization._id;
  await organization.save();
  return organization;
};

const getOrganizations = async (filter, options) => {
  const organizations = await Organization.paginate(filter, options);
  return organizations;
};

const getOrganizationById = async (id) => {
  const organization = await Organization.findById(id)
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  return organization;
};

const updateOrganization = async (id, updateData) => {
  const organization = await Organization.findById(id);

  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  if (organization.organizationLogo !== updateData.organizationLogo){
  if (updateData.organizationLogo && updateData.organizationLogo !== '') {
    const base64String = updateData.organizationLogo;
    const binaryData = Buffer.from(base64String, 'base64');
    const timestamp = Date.now();
    const key = `organization_logo/${updateData.organizationName}_${timestamp}.jpg`;
    // const photoUrl = await uploadToS3(key, binaryData);
    // updateData.organizationLogo = photoUrl;
  }
}

  Object.assign(organization, updateData);
  await organization.save();
  return organization;
};

const deleteOrganization = async (id, status) => {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  Object.assign(organization, organization.status = status);
  await organization.save();
  // If the organization status is 'Deleted', update the status of its users
  if (status === 'Deleted') {
    await User.updateMany(
      { orgId: organization._id },
      { $set: { status: 'Deleted' } }
    );
  } else if (status === 'Active') {
    await User.updateMany(
      { orgId: organization._id }, 
      { $set: { status: 'Active' } }
    );
  }
  return organization;
};
module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
};
