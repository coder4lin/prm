# prm - Prompt & Resource Manager

> 为工作空间/项目，提供一个干净独立skills、agents、mcp配置包

## why？
+ 痛点1：全局组件导致上下文窗口浪费，大模型的上下文窗口是宝贵资源。当窗口使用率达到 70% 时，模型推理能力会明显下降：
+ 痛点2：组件版本漂移与团队协作困难，通过仓库统一只需要安装一次就可以引用到不同项目中
+ 痛点3：组件质量参差不齐，类似功能的组件有十几个，哪个好用？某些组件用了一段时间后不再需要，但卸载麻烦、残留配置多

## how
1. 统一仓库
2. 项目隔离
3. 按需加载

## 如何安装

```bash
# 安装nodejs、pnpm

# 安装prm
git clone https://github.com/coder4lin/prm.git
cd prm
bash install.sh
```

## Usage

```bash
# 初始化仓库地址，默认在 ~/.prm/store/，可自行设定仓库目录
prm init-config [store-dictory]

# 帮助
prm help

# 建立仓库索引
prm index

# 查看仓库数据
prm store

# 在项目目录下面初始化目录
prm init

# 根据prm.json同步组件
prm sync

# 查看当前项目下安装的组件
prm list

```

## 项目下常用命令

| Command | Description |
|---------|-------------|
| `prm init` | 为项目初始化组件环境 |
| `prm sync` | 根据prm.json从本地仓库同步组件 |
| `prm list` | 列出以安装的组件 |


## 支持系统
MacOS

## 支持平台
- claude-code
- cursor
- opencode

## 本地仓库

```
~/.prm/store/
├── skills/    # Skill components
├── agents/    # Agent components
└── mcp/       # MCP configurations (JSON)
```

## 配置

全局配置: `~/.prm/config.json`，
项目配置: `PROJECT/.prm/prm.json`

## ROADMAP
+ 支持Windows、Linux
+ 支持更多的IDE
+ 目前需要手动配置仓库内容，后期会增加install命令，用于安装组件
+ 组件版本

## License

Apache LICENSE