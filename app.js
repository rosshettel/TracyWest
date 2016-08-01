var Twitter = require('twitter'),
    logger = require('./logger.js'),
    kanyeTwitterId = '169686021',
    trumpTwitterId = '25073877',
    TracyWest = function () {
        var self = this;

        this.kanyeStream = null;
        this.userStream = null;
        this.trumpStream = null;

        this.client = new Twitter({
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
            access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        });

        this.startStreams = function () {
            logger.info('TracyWest listening to streams 🐻');

            if (!self.kanyeStream) {
                self.client.stream('statuses/filter', {follow: kanyeTwitterId}, function (stream) {
                    self.kanyeStream = stream;

                    stream.on('data', self.postKanyeTweet);
                    stream.on('error', self.streamError);
                    stream.on('end', function (res) {
                        self.resurrectStreams(res, 'kanyeStream');
                    });
                });
            }

            if (!self.userStream) {
                self.client.stream('user', {}, function (stream) {
                    self.userStream = stream;

                    stream.on('favorite', self.followBack);
                    stream.on('follow', self.followBack);
                    stream.on('error', self.streamError);
                    stream.on('end', function (res) {
                        self.resurrectStreams(res, 'userStream');
                    });
                });
            }

            if (!self.trumpStream) {
                self.client.stream('statuses/filter', {follow: trumpTwitterId}, function (stream) {
                    self.trumpStream = stream;

                    stream.on('data', self.postTrumpReply);
                    stream.on('error', self.streamError);
                    stream.on('end', function (res) {
                        self.resurrectStreams(res, 'trumpStream');
                    });
                });
            }
        };

        this.postKanyeTweet = function (tweet) {
            if (tweet.user && tweet.user.id && tweet.user.id.toString() === kanyeTwitterId) {
                var newTweetContent = "Liz Lemon, " + tweet.text;
                if (newTweetContent.length > 140) {
                    newTweetContent = newTweetContent.substr(0, 137) + '...';
                }
                logger.info('Posting new Kanye tweet: ', newTweetContent);

                self.client.post('statuses/update', {status: newTweetContent}, function (err, tweet, response) {
                    if (err) {
                        logger.error('Error posting tweet:', err);
                    }
                });
            }
        };

        this.followBack = function (data) {
            var user = data.source;

            if (!user.following && user.screen_name !== 'tracy__west') {
                logger.info('Following ' + user.screen_name);
                self.client.post('friendships/create', {screen_name: user.screen_name}, function (err, data, response) {
                    if (err) {
                        logger.error('Error following ' + user.screen_name, err);
                    }
                });
            } else {
                logger.info('Already following ' + user.screen_name)
            }
        };

        this.postTrumpReply = function (tweet) {
            if (!tweet.user || tweet.user.screen_name !== 'readDonaldTrump') return;

            self.client.post('statuses/update', {
                'in_reply_to_status_id': tweet.id_str,
                status: '.@realDonaldTrump delete your account'
            }, function (err) {
                if (err) {
                    logger.error('Error posting tweet:', err);
                }
                Logger.info('Replied to Trump\'s tweet:', tweet.text);
            });
        };

        this.streamError = function (err) {
            // logger.error('Stream error', err);
        };

        this.resurrectStreams = function (res, stream) {
            logger.info('Resurrecting ' + stream + ' stream - ', res.statusMessage);

            self[stream] = null;

            if (res.statusCode === 420) {
                logger.info('Enhance our calm 🍁');
                setTimeout(function () {
                    self.startStreams();
                }, 1000 * 60 * 2);  // wait 2 minutes
            } else {
                self.startStreams();
            }
        };
    },
    app = new TracyWest();

app.startStreams();
