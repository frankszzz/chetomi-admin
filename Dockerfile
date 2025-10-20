# Usa Node.js versión 18
FROM node:18

# Crea el directorio de trabajo
WORKDIR /usr/src/app

# Copia el package.json y package-lock.json
COPY package.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos
COPY . .

# Expón los puertos del backend y frontend admin
EXPOSE 3001
EXPOSE 3002
