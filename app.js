var Twitter = require('twitter'),
    logger = require('./logger.js'),
    limit = require('simple-rate-limiter'),
    async = require('async'),
    kanyeTwitterId = '169686021',
    tracyTwitterId = '702579538362966016',
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
                    stream.on('quoted_tweet', self.followBack);
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
            var user = data.source,
                minutes = Math.floor(Math.random() * (25 - 5) + 5);

            logger.debug('followBack', {
                screen_name: user.screen_name,
                following: user.following,
                isUs: user.id_str === tracyTwitterId,
                minutes: minutes
            });

            if (!user.following && user.id_str !== tracyTwitterId) {
                setTimeout(function () {
                    self.client.post('friendships/create', {screen_name: user.screen_name}, function (err, data, response) {
                        if (err) {
                            logger.error('Error following ' + user.screen_name, err);
                        }
                        logger.info('Followed ' + user.screen_name);
                    });
                }, 1000 * 60 * minutes);
            }
        };

        this.postTrumpReply = function (tweet) {
            var responses = [
                'delete your account',
                'show us your tax returns!',
                '#JustMakeIndianaGreatAgainFirst',
                'many people have been saying you donated to #NAMBLA'
            ];

            if (tweet.user && tweet.user.id_str === trumpTwitterId) {
                self.client.post('statuses/update', {
                    'in_reply_to_status_id': tweet.id_str,
                    status: '@realDonaldTrump ' + responses[Math.floor(Math.random() * responses.length)]
                }, function (err) {
                    if (err) {
                        logger.error('Error posting tweet:', err);
                    }
                    logger.info('Replied to Trump\'s tweet: ' + tweet.text);
                });
            }
        };

        this.streamError = function (err) {
            // logger.error('Stream error', err);
        };

        this.resurrectStreams = function (res, stream) {
            logger.debug('Resurrecting ' + stream + ' stream - ', res.statusMessage);

            self[stream] = null;

            if (res.statusCode === 420) {
                logger.info('Enhance our calm 🍁 - ' + stream);
                setTimeout(function () {
                    self.startStreams();
                }, 1000 * 60 * 2);  // wait 2 minutes
            } else {
                self.startStreams();
            }
        };

        this.unfollowIfNotFollowing = function () {
            var followCountBefore = 0,
                followCountAfter = 0,
                followersChunked = [],
                unfollowUser = limit(function (user_id) {
                    self.client.post('friendships/destroy', {user_id: user_id}, function (err, data, res) {
                        if (err) {
                            logger.error('Error unfollowing', err);
                        }
                        followCountAfter--;
                    })
                }).to(1).per(1000),
                getFriendships = limit(function (followers) {
                    self.client.get('friendships/lookup', {user_id: followers.join(',')}, function (err, data, res) {
                        if (err) {
                            logger.error('Error getting friendships', err);
                        }

                        //now loop through and unfriend people who arent following us
                        data.forEach(function (friendship) {
                            if (friendship.connections.indexOf('followed_by') == -1) {
                                logger.debug('Unfollowing ' + friendship.screen_name, JSON.stringify(friendship.connections));
                                unfollowUser(friendship.id_str);
                            }
                        });
                    });
                }).to(1).per(1000 * 60);    //once per minute

            self.client.get('friends/ids', {user_id: tracyTwitterId, stringify_ids: true}, function (err, data, res) {
                if (err) {
                    logger.error('Error getting friends list', err);
                }
                followCountBefore = data.ids.length;
                followCountAfter = data.ids.length;
                logger.debug('Follow count before:', followCountBefore);

                while (data.ids.length > 0) {
                    followersChunked.push(data.ids.splice(0, 100));
                }

                async.each(
                    followersChunked,
                    function (followers) {
                        getFriendships(followers);
                    },
                    function () {
                        logger.info("Pruned following list from %d to %d", followCountBefore, followCountAfter);
                    }
                );
            });
        };
    },
    app = new TracyWest();

app.startStreams();

app.unfollowIfNotFollowing();
setTimeout(function () {
    self.unfollowIfNotFollowing();
}, 1000 * 60 * 60 * 12);    //every 12 hours

logger.info('TracyWest app started 🐻');
