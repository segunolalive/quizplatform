const router = require('express').Router();

// import route controllers
const admin = require('../controllers/admin');


// pack routes
router.post('/create-pack', admin.createPack);
router.get('/pack/:name', admin.getPack);
router.post('/pack/:name', admin.addQuestionToPack);
router.delete('/pack/:name', admin.deletePack);
router.get('/pack', admin.getPackList);
router.get('/question/:id/edit', admin.getEditQuestion);
router.post('/question/:id/edit', admin.editQuestion);
router.delete('/question/:id', admin.deleteQuestion);


// news routes
router.get('/news', admin.listNews);
router.post('/news', admin.addNews);
router.get('/news/:id/edit', admin.getEditNews);
router.post('/news/:id/edit', admin.editNews);
router.delete('/news/:id', admin.deleteNews);

// faqs routes
router.get('/faqs', admin.listFaqs);
router.post('/faqs', admin.addFaq);
router.get('/faqs/:id/edit', admin.getEditFaq);
router.post('/faqs/:id/edit', admin.editFaq);
router.delete('/faqs/:id', admin.deleteFaq);


router.get('/institution', admin.getInstitutions);
router.post('/institution', admin.addInstitution);
router.get('/institution/:id/edit', admin.getEditInstitution);
router.post('/institution/:id/edit', admin.editInstitution);
router.delete('/institution/:id', admin.deleteInstitution);

router.get('/token/:filename', admin.showToken);
router.post('/token', admin.createToken);


router.post('/make-staff', admin.makeStaff);
router.post('/season-reset', admin.resetSeason);


// root admin route
router.get('/', admin.getAdmin);

module.exports = router;
