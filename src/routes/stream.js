const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCurrentStream,
  setCurrentStream,
  stopStream,
  updateStreamScore,
  addCaster,
  removeCaster,
  getAllCasters,
  assignCasterToStream,
  removeCasterFromStream,
  getCasterById,
  getStreamArchive
} = require('../controllers/streamController');

router.get('/current', getCurrentStream);
router.put('/current', auth, setCurrentStream);
router.put('/current/score', auth, updateStreamScore);
router.post('/:id/stop', auth, stopStream);

router.get('/archive', getStreamArchive);
router.get('/casters', getAllCasters);
router.post('/casters', auth, addCaster);
router.get('/casters/:id', getCasterById);
router.delete('/casters/:id', auth, removeCaster);
router.post('/casters/assign', auth, assignCasterToStream);
router.post('/casters/unassign', auth, removeCasterFromStream);

module.exports = router;
