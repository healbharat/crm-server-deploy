/* eslint-disable no-param-reassign */
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');

const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options = {}) {
    let sort = '';
    const sortingCriteria = [];
    if (options.sortBy) {
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
    } else {
      sortingCriteria.push('-createdAt');
    }
    sort = sortingCriteria.join(' ');

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Add support for text query (if any)
    if (filter.query) {
      filter.$or = [
        { firstName: { $regex: filter.query, $options: 'i' } },
        { lastName: { $regex: filter.query, $options: 'i' } },
        { email: { $regex: filter.query, $options: 'i' } },
        { title: { $regex: filter.query, $options: 'i' } },
        { name: { $regex: filter.query, $options: 'i' } },
        { teamName: { $regex: filter.query, $options: 'i' } },
        { companyName: { $regex: filter.query, $options: 'i' } },
      ];
      delete filter.query;
    }
    // Fetch documents with pagination
    let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      let populateOptions;

      if (typeof options.populate === 'string') {
        populateOptions = options.populate.split(',').map((populateOption) => populateOption.trim());
      } else if (Array.isArray(options.populate)) {
        populateOptions = options.populate;
      } else {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid populate format: must be a string or an array');
      }

      const populateArray = populateOptions.map(buildPopulate);

      populateArray.forEach((populateOption) => {
        docsPromise = docsPromise.populate(populateOption);
      });
    }

    const countPromise = this.countDocuments(filter).exec();
    const [totalResults, docs] = await Promise.all([countPromise, docsPromise]);

    // Calculate totalResults based on returned results length
    const totalPages = Math.ceil(totalResults / limit);

    const result = {
      results: docs,
      page,
      limit,
      totalPages,
      totalResults,
    };
    return Promise.resolve(result);
  };
};
function buildPopulate(populateInput) {
  if (typeof populateInput === 'string') {
    const paths = populateInput.trim().split('.');
    return paths.reverse().reduce((populateObj, path) => {
      if (!populateObj) {
        return { path };
      }
      return { path, populate: populateObj };
    }, null);
  }
  if (typeof populateInput === 'object' && populateInput !== null) {
    return populateInput;
  }
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    `Invalid populateInput: expected a string or object but got ${typeof populateInput}`
  );
}

module.exports = paginate;
