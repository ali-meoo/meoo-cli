# Meoo CLI

[![npm](https://img.shields.io/npm/v/@aliyun-meoo/cli)](https://www.npmjs.com/package/@aliyun-meoo/cli)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://github.com/ali-meoo/meoo-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

秒悟（Meoo）官方命令行工具，让 Claude Code、Codex、Cursor、Qoder 等本地 AI 助手在帮你写完前端代码后，能直接接管「数据库、用户登录、文件存储、部署上线」的所有云端工作——你只需要在终端跑一条命令，剩下的交给 AI。

> **完整文档索引** https://docs.meoo.com/llms.txt
> 获取所有可用文档页面的完整列表。

## 适用场景

在 Codex / Claude Code 里写好的本地项目，过去只能跑在自己电脑上。装上 Meoo CLI 之后，AI 助手就能直接帮你接入数据库、生成接口，并把项目部署到云端，最终给你一个可分享的访问链接。

**支持的 AI 助手**：Claude Code、Cursor、Codex、Windsurf、Qoder、Trae、Cline 等主流本地 AI 编程工具均已适配。

## 作为 Claude Code 插件安装

```bash
# 添加市场源
/plugin marketplace add ali-meoo/meoo-cli

# 安装插件
/plugin install meoo-cli@ali-meoo
```

安装后 Claude Code 会自动获得 Meoo 全栈构建技能，在需要时自动调用。

## 安装 CLI

前置条件：
- [Node.js 20+](https://nodejs.org/en/download/)
- macOS 推荐通过 nvm 或 Homebrew 安装 Node.js
- Windows 还需安装 Git for Windows 和 zip 工具

```bash
npm install -g @aliyun-meoo/cli
```

验证安装：

```bash
meoo --version
```

或者直接让 AI 助手帮你装——在本地 agent 中执行：

```
读取 meoo.com/skill-setup.md 并按照说明安装秒悟技能
```

## 登录授权

```bash
meoo login
```

CLI 会自动打开浏览器，跳转到 meoo.com 的授权页面。首次需要登录秒悟账号，之后只需确认设备名称并点击「授权登录」。授权成功后回到终端，CLI 会自动保存凭证。

## 快速上手

使用你日常的 AI 助手（以 Claude Code 为例）打开一个本地项目，然后用自然语言告诉它：

```
帮我用 meoo cli 给这个项目加上数据库、用户登录功能，并部署上线
```

AI 助手会自动完成所有事情——调用 Meoo CLI 在云端开通 PostgreSQL 数据库、自动生成接口、把环境变量写入项目、补齐缺失的后端代码。

AI 干完活后，让它先在本地起一个预览：

```
起个本地预览看看效果
```

确认没问题后：

```
部署上线
```

AI 会自动执行 `meoo deploy`，构建打包并发布到 CDN，最终输出一个可直接分享的访问链接。

## 核心命令

```bash
meoo login                      # 登录授权
meoo init react-design          # 从模板初始化项目
meoo projects create "My App"   # 创建远程项目
meoo cloud enable               # 开通云服务（PostgreSQL + Auth + Storage）
meoo cloud pull-env             # 拉取云服务环境变量到本地 .env
meoo deploy                     # 构建并发布到 CDN
meoo sandbox push               # 推送本地代码到云端沙箱
meoo sandbox pull               # 拉取沙箱代码到本地
meoo db query "SELECT ..."      # 执行 SQL 查询
meoo fn deploy <name>           # 部署边缘函数
meoo account                    # 查看套餐、积分和权益
meoo info                       # 查看运行环境和约束信息
```

## 常见问题

| 问题 | 解决方式 |
|------|---------|
| 配额不足 / 数据库存储超限 | 终端跑 `meoo account` 查看额度，去 [meoo.com](https://meoo.com) 升级套餐 |
| AI 助手调用失败 | 重新执行 `meoo login` 刷新凭证 |
| 部署后页面白屏 | 检查项目是否使用了 Hash 路由（`createHashRouter`），CDN 不支持 BrowserRouter |
| 想升级 CLI | 终端跑 `meoo upgrade` |

## 文档

- [完整文档](https://docs.meoo.com)
- [文档索引（LLM 友好）](https://docs.meoo.com/llms.txt)

## License

[MIT](LICENSE)
