// 引入数据库配置和User模型（路径和你项目保持一致）
import { sequelize, User} from './models';
import { Op, Sequelize } from 'sequelize';
async function listAllUsers() {
  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功，开始查询用户数据...\n');

    // ========== 核心修改：去掉不存在的 updated_at 字段 ==========
    const allUsers = await User.findAll({
      // 只查询数据库中实际存在的字段！
      attributes: ['id', 'username', 'role', 'created_at'], 
      order: [['created_at', 'DESC']], // 按创建时间倒序
    });

    // 格式化输出（更易读）
    console.log('用户列表（ID | 用户名 | 角色 | 创建时间）：');
    console.log('-------------------------------------------');
    allUsers.forEach(user => {
      const { id, username, role, created_at } = user.toJSON(); // 转成普通对象，避免Sequelize实例属性干扰
      console.log(`${id} | ${username} | ${role} | ${created_at}`);
    });

    console.log(`\n总计：${allUsers.length} 个用户`);
  } catch (err) {
    console.error('查询用户数据失败：', err);
  } finally {
    await sequelize.close(); // 关闭数据库连接
  }
}

// 执行查询
listAllUsers();