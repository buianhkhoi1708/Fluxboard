const Department = require('../../department/models/department.model');

exports.getOrganizationTree = async () => {
    return await Department.aggregate([
        { $match: { is_deleted: false } },
        {
            $lookup: {
                from: 'users',
                localField: 'manager_id',
                foreignField: '_id',
                as: 'manager'
            }
        },
        { $unwind: { path: '$manager', preserveNullAndEmptyArrays: true } },
        {
            // Join với Team để lấy các Team thuộc Department
            $lookup: {
                from: 'teams',
                localField: '_id',
                foreignField: 'department_id',
                pipeline: [
                    { $match: { is_deleted: false } },
                    {
                        // Join với User để lấy Lead của Team
                        $lookup: {
                            from: 'users',
                            localField: 'lead_id',
                            foreignField: '_id',
                            as: 'lead'
                        }
                    },
                    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
                    {
                        // Join với User để lấy danh sách Members thuộc Team
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
                    },
                    {
                        $project: {
                            id: '$_id', _id: 0, name: 1, code: 1,
                            lead_id: 1, lead_name: '$lead.full_name',
                            members: 1
                        }
                    }
                ],
                as: 'teams'
            }
        },
        {
            $project: {
                id: '$_id', _id: 0, name: 1, code: 1,
                manager_id: 1, manager_name: '$manager.full_name',
                teams: 1
            }
        }
    ]);
};