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
        // kanyeTwitterID = '259495612'; //actually rosshettel
        kanyeTwitterID = '169686021';

        logger.debug('TracyWest app started 🐻');

        twitter.stream('statuses/filter', {follow: kanyeTwitterID}, function (stream) {
            stream.on('data', function (tweet) {
                if (tweet.user && tweet.user.id && tweet.user.id.toString() === kanyeTwitterID) {
                    // logger.debug('new kanye tweet', tweet);

                    var newTweetContent = "Liz Lemon, " + tweet.text;
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
                logger.info('Stream end', response);
                //maybe exit the process so we reconnect to the stream?
            });
        });
});
