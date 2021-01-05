const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = function(env) {
    return {
        entry: './src/main.js',
        target: 'web',

        plugins: [
            new CleanWebpackPlugin(),
            new HtmlWebpackPlugin({
                template: './src/index.html',
                // favicon: './src/img/favicon.ico',
                baseUrl: env.development ?
                    '/' : 'https://madblade.github.io/widget-mobile-controller/'
            }),
            new webpack.HotModuleReplacementPlugin()
        ],

        output: {
            path: path.resolve(__dirname, './dist'),
            publicPath: './',
            filename: '[name].[hash].js'
        },

        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    }
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(png|svg|jpg|gif)$/,
                    use: [
                        'file-loader',
                    ],
                },
            ]
        },

        // devtool: 'inline-source-map',

        devServer: {
            contentBase: 'http://localhost:8080/dist',
            port: 8080,
            hot: true,
            disableHostCheck: true
        },

        optimization: {
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all'
                    }
                }
            }
        }
    };
};
