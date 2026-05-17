const Department = require('../../department/models/department.model');

exports.getOrganizationTree = async () => {
    return await Department.aggregate([
        // Chỉ lấy các node gốc (Root Nodes) không bị xóa
        { $match: { parent_id: null, is_deleted: false } },
        
        // Dùng $graphLookup quét đệ quy cấu trúc cây đa cấp
        {
            $graphLookup: {
                from: 'departments',
                startWith: '$_id',
                connectFromField: '_id',
                connectToField: 'parent_id',
                as: 'sub_departments',
                depthField: 'level',
                restrictSearchWithMatch: { is_deleted: false }
            }
        },
        
        // Dưới mỗi Department/Sub-Department, lấy các Teams tương ứng
        {
            $lookup: {
                from: 'teams',
                localField: '_id',
                foreignField: 'department_id',
                pipeline: [
                    { $match: { is_deleted: false } },
                    {
                        $lookup: {
                            from: 'users',
                            localField: '_id',
                            foreignField: 'team_id',
                            pipeline: [
                                { $match: { status: 'ACTIVE' } },
                                { $project: { _id: 1, full_name: 1, email: 1, avatar_url: 1 } }
                            ],
                            as: 'members'
                        }
                    }
                ],
                as: 'teams'
            }
        }
    ]);
};