const router = require('express').Router();

// import route controllers
const admin = require('../controllers/admin');


// pack routes
router.post('/create-pack', admin.createPack);
router.get('/pack/:name', admin.getPack);
router.post('/pack/:name', admin.addQuestionToPack);

// news routes
router.get('/news', admin.listNews);
router.post('/news', admin.addNews);
router.delete('/news/:id', admin.deleteNews);

router.get('/institution', admin.getInstitutions);
router.delete('/institution/:id', admin.deleteInstitution);

// root admin route
router.get('/', admin.getAdmin);

module.exports = router;