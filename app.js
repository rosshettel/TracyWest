var ClusterWrapper = require('./clusterWrapper');

ClusterWrapper.run(function () {
    var Twitter = require('twitter'),
        twitter = new Twitter({
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
            access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        }),
        logger = require('./logger'),
        kanyeTwitterID = '169686021',
        handleStreamEnd = function (response) {
            if (response.status === 420) {
                logger.info('Enhance our calm 🍁');
                setTimeout(function () {
                    logger.info('Calm enhanced, restarting');
                    process.exit(420);
                }, 1000 * 60 * 15);     //wait 15 minutes
            } else {
                logger.info('User stream end', response.statusMessage);
                process.exit(2);
            }
        },
        followBack = function (user) {
            if (!user.following && user.screen_name !== 'tracy__west') {
                logger.info('Following ' + user.screen_name);
                twitter.post('friendships/create', {screen_name: user.screen_name}, function (err, data, response) {
                    if (err) {
                        logger.error('Error following ' + user.screen_name, err);
                    }
                });
            } else {
                logger.info('Already following ' + user.screen_name)
            }

        };

        logger.debug('TracyWest app started 🐻');

        twitter.stream('statuses/filter', {follow: kanyeTwitterID}, function (stream) {
            stream.on('data', function (tweet) {
                if (tweet.user && tweet.user.id && tweet.user.id.toString() === kanyeTwitterID) {
                    var newTweetContent = "Liz Lemon, " + tweet.text;
                    if (newTweetContent.length > 140) {
                        newTweetContent = newTweetContent.substr(0, 137) + '...';
                    }
                    logger.info('Posting new Kanye tweet: ', newTweetContent);

                    twitter.post('statuses/update', {status: newTweetContent}, function (err, tweet, response) {
                        if (err) {
                            logger.error('Error posting tweet:', err);
                        }
                    });
                }
            });

            stream.on('error', function (error) {
                logger.error('Stream error', error);
            });

            stream.on('end', function (response) {
                handleStreamEnd(response);
            });
        });

        twitter.stream('user', {}, function (stream) {
            stream.on('favorite', function (data) {
                followBack(data.source);
            });

            stream.on('follow', function (data) {
                followBack(data.source);
            });

            stream.on('error', function (error) {
                logger.error('Stream error', error);
            });

            stream.on('end', function (response) {
                handleStreamEnd(response);
            });
        });
});
