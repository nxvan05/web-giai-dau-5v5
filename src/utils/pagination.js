function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginatedResponse(data, page, limit, total) {
  return {
    data,
    pagination: {
      page, limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = { getPagination, paginatedResponse };
