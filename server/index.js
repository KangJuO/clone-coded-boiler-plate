//install express module => can start with express function 
//install mongoose module => can connect to mongDB
const express = require('express');
const app = express();
const port = 80;
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const config = require('./config/key');
const { User } = require('./models/User');
const { auth } = require('./middleware/auth');
//const https = require('https');
//const fs = require('fs');

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json());
app.use(cookieParser());

const mongoose = require('mongoose');
mongoose.connect(config.mongoURI, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
     useCreateIndex: true, 
     useFindAndModify: false  
}).then(() =>  console.log('MongDB Connected...'))
  .catch(err => console.log(err ))

// https
// .createServer(
//   {
//     key: fs.readFileSync(__dirname + '/key.pem', 'utf-8'),
//     cert: fs.readFileSync(__dirname + '/cert.pem', 'utf-8'),
//   },
//   app.use('/', (req, res) => {
//     res.send('Congrats! You made https server now :)');
//   })
// ).listen(port);

app.get('/api/hello', (req,res) => {
  res.send('hi')
})

app.post('/api/users/register', (req, res) => {
  //회원가입시 필요한 정보들을 client에서 가져오면
  //가져온 정보들을 db에 넣어준다.
  const user = new User(req.body);

  user.save((err, userInfo) => { 
    if(err) return res.json({success: false, err});
    return res.status(200).json({success: true}); 
  })

})

//로그인 기능
app.post('/api/users/login', (req, res) => {
  //요청된 이메일을 db에서 찾는다
  User.findOne({ email : req.body.email }, (err, user) => {
    //이메일이 없으면(못찾으면)
    if(!user){
      res.json({
        loginSuccess: false,
        message: '입력한 이메일에 해당하는 유저가 없습니다.'
      })
    }
    //이메일이 있다면
    //비밀번호가 일치하는지 확인
    //유저 모델에서 만든 메소드 사용(password 검사)
    user.comparePassword(req.body.password, (err, isMatch) => {
      //비밀번호가 다르면
      if(!isMatch){
        return res.json({
          loginSuccess: false,
          message: '비밀번호가 틀렸습니다'
         })
      }
      //비밀번호까지 일치한다면 토큰생성하기
      //유저 모델에서 만든 메소드 사용(토큰생성)
      user.generateToken((err, user) => {
        if(err) return res.status(400).send(err);
        //토큰을 어디에 저장해줘야하는데
        //선택지는 여러가지 쿠키, 로컬스토리지
        //여기서는 쿠키에 할거야
        res.cookie('x_auth', user.token)
        .status(200)
        .json({
          loginSuccess: true,
          userId: user._id
        })
      })
    })
  })
})

//인증
app.get('/api/users/auth', auth, (req, res)=> {
  //미들웨어를 통과했다면 인증을 통과했다는것
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true, // role 0 -> 일반유저 아니면 관리자
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image
  })
})

app.get('/api/users/logout', auth, (req, res) => {
  User.findOneAndUpdate({_id: req.user._id},
    {token: ""},
    (err, user) => {
      if(err) return res.json({success: false, err})
      return res.status(200).send({
        success: true
      })
    })
})


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})