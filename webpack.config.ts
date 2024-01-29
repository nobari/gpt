import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import {
  Configuration as WebpackConfiguration,
  WebpackOptionsNormalized
} from 'webpack'

// This interface is merging the properties from the webpack-dev-server typings.
interface Configuration extends WebpackConfiguration {
  devServer?: WebpackOptionsNormalized['devServer']
}

const DIST_FOLDER = 'docs'

const config = (env: { production: boolean }) => {
  const config: Configuration = {
    devtool: env.production ? false : 'inline-source-map',
    devServer: {
      liveReload: true,
      hot: true, // Enable Hot Module Replacement
      open: true // Open the browser after server has been started
    },
    mode: env.production ? 'production' : 'development',
    entry: { index: './src/index.ts' },
    module: {
      rules: [
        { test: /\.ts?$/, use: 'ts-loader', exclude: '/node_modules/' },
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader', // translates CSS into CommonJS
            'sass-loader' // compiles Sass to CSS, using Node Sass by default
          ]
        },
        { test: /\.html$/, use: 'html-loader' }
      ]
    },
    output: {
      path: path.join(__dirname, DIST_FOLDER),
      filename: '[name].js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      ...(env.production ? [new CleanWebpackPlugin()] : []),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'static',
            to: '.',
            globOptions: {
              ignore: ['**/.DS_Store'] // This line ignores .DS_Store files
            }
          }
        ]
      }),
      new MiniCssExtractPlugin({
        filename: 'styles.css'
      }),
      // HtmlWebpackPlugin instances for each HTML file
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './src/index.html', // Adjust this path to your actual popup HTML file
        chunks: ['index']
      })
    ]
  }
  return config
}

export default config
