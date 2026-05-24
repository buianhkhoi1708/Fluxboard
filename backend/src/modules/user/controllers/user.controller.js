const userService = require('../services/user.service');

// ==========================================
// 1. CORE USER CONTROLLERS
// ==========================================
exports.getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

exports.createUser = async (req, res, next) => {
    try {
        const newUser = await userService.createUser(req.body);
        res.status(201).json({ 
            success: true, 
            data: newUser, 
            message: 'Account created successfully' 
        });
    } catch (error) { next(error); }
};

// ==========================================
// 2. ORGANIZATION CONTROLLERS
// ==========================================
exports.getUnassignedUsers = async (req, res, next) => {
    try {
        const users = await userService.getUnassignedUsers();
        res.status(200).json({ success: true, data: users });
    } catch (error) { next(error); }
};

exports.assignToTeam = async (req, res, next) => {
    try {
        const { team_id } = req.body;
        if (!team_id) return res.status(400).json({ success: false, message: 'Missing team_id' });
        
        const user = await userService.assignTeam(req.params.id, team_id, req.user.id);
        res.status(200).json({ success: true, data: user, message: 'User assigned to team successfully' });
    } catch (error) { next(error); }
};

exports.revokeAccess = async (req, res, next) => {
    try {
        const result = await userService.revokeAccess(req.params.id, req.user.id);
        res.status(200).json({ success: true, message: 'User access revoked successfully' });
    } catch (error) { next(error); }
};

exports.getAllUsers = async (req, res, next) => {
    try {
        // Lấy page và size từ query (Frontend đang gửi page=0&size=100)
        const { page = 0, size = 100 } = req.query;
        
        // Gọi service xử lý logic
        const result = await userService.getAllUsers({
            page: parseInt(page),
            size: parseInt(size)
        });

        res.status(200).json({ 
            success: true, 
            code: 'SUCCESS',
            data: result.users,
            meta: {
                page: result.page,
                size: result.size,
                total_elements: result.totalElements,
                total_pages: result.totalPages,
                has_next: result.hasNext
            }
        });
    } catch (error) { 
        next(error); 
    }
};