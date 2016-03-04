var cluster = require('cluster'),
    logger = require('logger');

if (cluster.isMaster) {
    cluster.fork();

    cluster.on('exit', function () {
        logger.error('Cluster exiting');
        cluster.fork();
    });
}

if (cluster.isWorker) {
    var Twitter = require('twitter'),
        twitter = new Twitter({
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
            access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        }),
        // kanyeTwitterID = '259495612'; //actually rosshettel
        kanyeTwitterID = '169686021';

        logger.debug('TracyWest app started 🐻');

        process.on('uncaughtException', function (err) {
            logger.error('Uncaught Exception', err);
            process.exit(1);
        });

        twitter.stream('statuses/filter', {follow: kanyeTwitterID}, function (stream) {
            stream.on('data', function (tweet) {
                if (tweet.user && tweet.user.id && tweet.user.id.toString() === kanyeTwitterID) {
                    logger.debug('new kanye tweet', tweet);

                    var newTweetContent = "Liz Lemon, " + tweet.text;
                    logger.info('Posting new Kanye tweet', newTweetContent);

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
        });
}
