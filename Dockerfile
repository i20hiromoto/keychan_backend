FROM node:18

# Pythonをインストール
RUN apt-get update && apt-get install -y python3

# Pythonのパスとバージョンを確認
RUN which python3
RUN python3 --version

# 作業ディレクトリを設定
WORKDIR /app

# アプリケーションコードをコピー
COPY . /app

# 依存関係をインストール
RUN npm install

# アプリケーションを起動
CMD ["npm", "start"]
