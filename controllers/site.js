const Institution = require("../models/institution");
const NewsItem = require("../models/news");
const Pack = require("../models/pack");
const Question = require("../models/question");

const User = require("../models/user");
const Token = require("../models/token");

const helpers = require("../utils/helpers");


const getDashBoard = function (req, res) {
  Institution.findById({ _id: req.user.institution },
    function (err, institution) {
      if (err) {
        req.flash("error", "Unable to fetch Institution name");
      }
      let registrationEndpoint = '/dashboard';
      res.render("dashboard", { institution, endpoint: registrationEndpoint });
    }
  )
}



const newsList = function (req, res) {
  console.log("NEWS",req.user);
  NewsItem.find({}).sort({ _id: -1 }).exec(function (err, news) {
    if (err) {
      req.flash("failure", "Unable to fetch news feed");
      res.render("news");
    } else {
      res.render("news", { news });
    }
  })
};

// TODO:
const getQuizAuth = function (req, res) {
  if (!req.user || !req.user.isRegistered) {
    req.flash("failure", "Complete your registeration in order to compete");
    res.redirect("/dashboard");
    return;
  }
  res.render("quizInstruction");
}

// TODO:
const handleQuizAuth = function (req, res, next) {
  let redirectTo = req.session.redirectTo;
  let token = req.body.token;
  let user = req.user;
  req.checkBody("token", "provide a 12 didgit PIN").matches(/^(\d){12}$/);
  req.sanitizeBody("token").trim();
  req.sanitizeBody("token").escape();

  let errors = req.validationErrors();
  if (errors) {
    req.flash("error", errors[0].ms);
    res.redirect("/dashboard");
    return;
  }
  let foundToken = Token.findOne({ token }).exec();
  foundToken.then((token) => {
    if (!token) {
      req.flash("failure", "Invalid PIN. Ensure you have a valid PIN");
      res.redirect("/dashboard");
      return;
    }
    if (token.spent) {
      req.flash("failure", "Invalid PIN. Ensure you have a valid PIN");
      res.redirect("/dashboard");
      return;
    }
    if (!token.user && token.currentUse === 0 && !token.spent) {
      token.user = user._id;
      token.save();
    }
    if (user._id.toString() === token.user.toString() &&
        token.maxUse > token.currentUse
      ) {
      token.currentUse++;
      setSpent(token);
      token.save();
      req.session["quizReady"] = true;
      res.redirect(redirectTo);
    } else if (user._id.toString() === token.user.toString()) {
      req.flash("failure", "Maximum PIN usage exceeded. Get a new PIN");
      res.redirect("/dashboard");
    } else if (user._id.toString() !== token.user.toString()) {
      req.flash("failure", "This PIN has been used by another user");
      res.redirect("/dashboard");
    }
  }).catch((err) =>{
    res.redirect("/dashboard", { errors })
  })
}

function setSpent(token) {
  if (token.currentUse >= token.maxUse) {
    token.user = null;
    token.spent = true;
  }
  return token;
}

const tokenRegistration = function (req, res, next) {
  let token = req.body.token;
  req.checkBody('token', 'Please enter a valid 12 digit PIN')
               .matches(/^(\d){12}$/);
  req.sanitizeBody("token").trim();
  req.sanitizeBody("token").escape();
  const errors = req.validationErrors();
  if (errors) {
    req.flash("error", errors[0].msg)
    res.redirect("/dashboard");
    return;
  }
  Token.findOne({ token }, function (err, token){
    if (err) {
      req.flash("failure", "An error occured while validating Token");
      res.redirect("/dashboard")
    } else if (token) {
      console.log("token found");
      User.findByIdAndUpdate(
        { _id: req.user._id },
        { isRegistered: true },
        function ( err, user) {
          if (err) {
            console.log(err);
            next(err);
            return;
          }
          token.user = user._id;
          token.currentUse++;
          token.save();
          req.flash(
            "message", "Registration Complete. " +
            "Now you can Participate in competitions"
          )
          res.redirect("/dashboard");
        }
      )
    } else {
      req.flash("failure", "Invalid Token")
      res.redirect("/dashboard")
    }
  })
}



function verifyToken (req, res) {
  let serial = req.body.serial;
  Token.findOne({serial}).exec().then((token) => {
    if(!token || token.currentUse >= token.maxUse ||  token.spent) {
      req.flash("error", "Invalid PIN.");
      res.redirect("/dashboard");
      return;
    } else if(token.user && token.user.toString() !== req.user._id.toString()) {
      req.flash("error", "PIN has been used by another user");
      res.redirect("/dashboard");
      return;
    } else {
      req.flash("message", "PIN is valid.");
      res.redirect("/dashboard");
    }
  }).catch((err)=> {
    req.flash("error", "An error occured");
    res.redirect("/dashboard")
  })
}


function getToken(req, res) {
  res.render("tokenForm");
}

const getQuiz = function (req, res) {
  Pack.count().exec(function (err, count) {
    var random = Math.floor(Math.random() * count);
    Pack.findOne().skip(random).populate("questions").exec(
      function (err, pack) {
        if (err) {
          req.flash("failure", "Unable to fetch quiz");
          res.render("index");
        } else {
          req.session["quizReady"] = false;
          req.session["startTime"] = Date.now();
          req.session["pack"] = pack.name;
          res.render("quiz", { pack });
        }
      }
    );
  })
}


const evaluateQuiz = function (req, res) {
  // if user token count >= maxTokenUse take care of things
  // time allowed is 6.5mins + 10secs extra for latency.
  const TIME_ALLOWED = 6.5 * 60 * 1000 + 10 * 1000;
  const finishTime = Date.now();
  const startTime = req.session.startTime;
  const timeTaken = finishTime - startTime;
  const packName = req.session.pack;
  delete req.session.startTime;
  // delete req.session.pack;
  if (timeTaken > TIME_ALLOWED) {
    req.flash("failure", "Invalid submission. You submitted too late");
    res.redirect("/");
  } else {
    Question.find(
      {pack: packName},
      {"correctAnswer": 1, _id: 0},
      (err, questions) => {
        if (err) {
          console.log(err);
          req.flash("error", "Something went wrong");
          res.redirect("/");
          return;
        } else {
          let score = 0;
          let correct = 0;
          let wrong = 0;
          for (var i in req.body) {
            if (req.body[i] === questions[i].correctAnswer) {
              ++score;
              ++correct;
            } else {
              score -= 0.4;
              ++wrong;
            }
          }
          let unAnswered = questions.length - (correct + wrong);
          score = score.toFixed(1);
          const competition = getCompetitionName(req);
          saveScore(req.user._id, score, timeTaken, competition);
          res.render("result", { score, correct, wrong, unAnswered })
        }
      }
    )
  }
}

function getCompetitionName(req) {
  let redirectTo = req.session.redirectTo.slice(1);
  let competition;
  switch (redirectTo) {
    case "virtual-quiz":
      competition = "virtualQuiz";
      break;
    case "scholars-cup":
      competition = "scholarsCup";
      break;
    case "grants":
      competition = "educationGrant";
      break;
    case "scholars-bowl":
      competition = "scholarsBowl";
      break;
    }
    return competition;
}

const saveScore = (userId, score, time, competition) => {
  User.findById({_id: userId}).exec().then((user)=> {
    if (user[competition].score < score) {
      user[competition].score = score;
      if (user[competition].time === 0 || user[competition].time > time) {
        user[competition].time = time;
      }
    } else if (user[competition].score === score) {
      if (user[competition].time === 0 || user[competition].time > time) {
        user[competition].time = time;
      }
    }
    user[competition].attempts++;
    return user;
  }).then((user) => {
    user.save();
  }).catch((err)=> {
    console.log(err);
    return;
  })
}


const getRanking = function (req, res) {
  User.find({institution: req.user.institution})
      .sort({score: -1, time: 1})
      .limit(50)
      .exec(function (err, users) {
        if (err) {
          console.log(err);
        } else {
          res.render('ranking', {users});
        }
      });
}


function ranking (req, res) {
  let url = req.url;
  Institution.find({}).exec().then((institutions) => {
    res.render("ranking", { institutions, url })
  })
}

function institutionRanking (req, res) {
  let institutionId = req.user.institution;
  let competition = req.body.competition;
  req.sanitizeBody("competition").trim();
  req.sanitizeBody("competition").escape();
  let selectQuery = {  firstName: 1, surName: 1, username: 1 };
  selectQuery[competition] = 1;
  let sortQuery = {};
  sortQuery[competition + '.score'] = 1;
  sortQuery[competition + '.time'] = -1;

  User.find({ institution: institutionId })
      .select(selectQuery)
      .sort(sortQuery)
      .limit(50)
      .exec().then((users) => {
        res.render("ranking", {users, competition})
      })
}


function topApplicants (req, res) {
  let url = req.url;
  let institutionId = req.user.institution;
  let competition = req.body.competition;
  req.sanitizeBody("competition").trim();
  req.sanitizeBody("competition").escape();
  let selectQuery = {  firstName: 1, surName: 1, username: 1 };
  selectQuery[competition + '.attempts'] = 1;
  let sortQuery = { attempts: -1 };

  User.find({ institution: institutionId })
      .select(selectQuery)
      .sort(sortQuery)
      .limit(50)
      .exec().then((users) => {
        res.render("ranking", {users, competition})
      })
}

module.exports = {
  getDashBoard,
  newsList,
  getRanking,
  getQuizAuth,
  handleQuizAuth,
  tokenRegistration,
  getToken,
  getQuiz,
  evaluateQuiz,
  verifyToken,
  ranking,
  institutionRanking,
  topApplicants,
};
