# 构建阶段：安装依赖并将 TypeScript 编译成 JavaScript。
FROM node:24-bookworm-slim AS build

# 固定 pnpm 版本，避免不同机器使用不同的依赖安装规则。
RUN npm install --global pnpm@10.34.7
WORKDIR /app/server

# 先复制依赖清单；源码变化时可以复用依赖安装缓存。
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json index.ts ./
COPY tools ./tools
RUN pnpm build

# 编译结束后移除 TypeScript、nodemon 等开发依赖。
RUN pnpm prune --prod

# 运行阶段：仅保留 Node、运行依赖和编译产物。
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/node_modules ./node_modules

# 将 dist 的内容直接放到 server 下，保持 __dirname 的相对路径正确。
COPY --from=build /app/server/dist/ ./

# 仅记录服务端口；不会自动向宿主机发布端口。
EXPOSE 4004

# JSON 数据和证书由运行时挂载，不写入镜像。
CMD ["node", "index.js"]
