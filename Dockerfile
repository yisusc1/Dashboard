# Usa una imagen base oficial de Node.js ligera
FROM node:18-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias y las instala
COPY package*.json ./
RUN npm install --production

# Copia el resto de los archivos de tu proyecto al contenedor
COPY . .

# Expone el puerto en el que corre tu aplicación
EXPOSE 3000

# El comando para iniciar tu servidor cuando el contenedor se ejecute
CMD [ "node", "server.js" ]