// 引入项目的数据库配置和User模型
import {sequelize,User } from './models'; // 路径要和你项目的models目录匹配
import { Op, Sequelize } from 'sequelize';
// 定义测试账号的特征（比如用户名包含test_、admin_test等）
async function deleteTestUsers() {
  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功，开始删除测试账号...');

    // ========== 核心：筛选并删除测试账号 ==========
    // 方式1：删除用户名包含指定关键词的测试账号（推荐，精准）
    // 比如你测试的用户名是 test_merchant_001、test_admin_001 等，都包含 test_
    const deletedTestUsers = await User.destroy({
      where: {
        username: {
          [Op.like]: '%test_%' // 匹配用户名含 test_ 的所有账号
        }
      },
      // 可选：先打印要删除的账号，确认后再执行删除（注释掉上面的destroy，打开下面的findAll）
      // limit: 100 // 限制查询数量，避免数据太多
    });


    console.log(`成功删除 ${deletedTestUsers} 个测试账号`);
  } catch (err) {
    console.error('删除测试账号失败：', err);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 执行删除函数
deleteTestUsers();