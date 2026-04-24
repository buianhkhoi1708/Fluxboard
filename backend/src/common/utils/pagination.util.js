exports.paginate = async (model, query = {}, page = 1, limit = 10, populateArgs = '') => {
    const skip = (page - 1) * limit;
    
    const [content, totalElements] = await Promise.all([
        model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).populate(populateArgs).lean(),
        model.countDocuments(query)
    ]);

    return {
        content,
        page_meta: {
            total_elements: totalElements,
            total_pages: Math.ceil(totalElements / limit),
            current_page: Number(page),
            page_size: Number(limit)
        }
    };
};