function applyFilter(filter, key) {
    if (filter.data) {
      if (Array.isArray(filter.data)) {
        filter[key] = { $in: filter.data };
      } else {
        filter[key] = filter.data;
      }
    }
    return filter;
  }
  
  module.exports = { applyFilter };