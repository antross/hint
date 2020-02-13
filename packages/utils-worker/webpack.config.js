const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env) => {
    return {
        context: __dirname,
        entry: { 'content-script/webhint': './dist/src/content-script/webhint.js' },
        mode: env && env.release ? 'production' : 'none',
        module: {
            rules: [
                // Bundle `axe-core` as a raw string so it can be injected at runtime.
                {
                    test: /axe-core/,
                    use: 'raw-loader'
                },
                // Bundle `js-library-detector as a raw string so it can be injected at runtime.
                {
                    test: /js-library-detector/,
                    use: 'raw-loader'
                },
                {
                    test: /\.md$/,
                    use: 'raw-loader'
                }
            ]
        },
        node: {
            __dirname: true,
            fs: 'empty'
        },
        optimization: {
            minimizer: [
                /*
                 * Fix handling of non-ASCII characters in minified content script
                 * when running in Chrome by forcing them to be escaped.
                 */
                // eslint-disable-next-line camelcase
                new TerserPlugin({ terserOptions: { output: { ascii_only: true } } })
            ]
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist/bundle')
        },
        plugins: [
            new webpack.DefinePlugin({
                DESIGN_SYSTEM: JSON.stringify(env && env.design || 'fluent'),
                'process.env.webpack': JSON.stringify(true)
            })
        ],
        resolve: {
            alias: {
                './get-message$': path.resolve(__dirname, 'dist/src/shims/get-message.js'),
                './request-async$': path.resolve(__dirname, 'dist/src/shims/request-async.js'),
                'acorn-jsx$': path.resolve(__dirname, 'dist/src/shims/acorn-jsx.js'),
                'acorn-jsx-walk$': path.resolve(__dirname, 'dist/src/shims/acorn-jsx-walk.js'),
                'axe-core': require.resolve('axe-core/axe.min.js'),
                url$: path.resolve(__dirname, 'dist/src/shims/url.js')
            }
        }
    };
};
