# Multi-stage build для оптимизации размера образа
FROM node:18-alpine AS base

# Установка рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка только production зависимостей
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage
FROM node:18-alpine

WORKDIR /app

# Создание пользователя для запуска приложения (безопасность)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копирование зависимостей из base stage
COPY --from=base /app/node_modules ./node_modules

# Копирование исходного кода приложения
COPY --chown=nodejs:nodejs . .

# Создание директорий для данных с правильными правами
RUN mkdir -p /app/database /app/database/uploads /app/public/images /app/temp && \
    chown -R nodejs:nodejs /app/database /app/public/images /app/temp

# Переключение на непривилегированного пользователя
USER nodejs

# Открытие порта
EXPOSE 3000

# Healthcheck для проверки работоспособности контейнера
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запуск приложения
CMD ["npm", "start"]
