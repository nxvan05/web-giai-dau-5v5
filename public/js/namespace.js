// EvanCup namespace — groups window functions by module to avoid naming conflicts
// All window.* assignments remain intact for onclick backward compatibility
(function() {
  var ns = window.EvanCup = {};

  ns.Core = {};
  var coreFns = ['showLoading','hideLoading','rankPointsMap','api','apiLogout','discordUser',
    'closeUserMenu','initUserMenu','checkDiscordAuth','loginDiscord','logoutDiscord',
    'initSocket','socket'];
  coreFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Core[k] = window[k]; });

  ns.Modals = {};
  var modalFns = ['toggleHelpModal','toggleHelpDetailed','openMatchDetail','closeMatchDetail',
    'openScoreReport','closeScoreReport','submitScoreReport','openQrModal','closeQrModal',
    'openQrFullscreen','closeQrFullscreen','openResultModal','closeResultModal',
    'submitMatchResult','openMvpModal','closeMvpModal','submitMvp','openDisputeModal',
    'closeDisputeModal','submitDispute','showToast','openGuidePopup','closeGuidePopup',
    'confirmAdminLogin','openAdminLoginModal','draftState','draggedPlayer',
    'openDraftPreviewModal','closeDraftPreviewModal','addDraftTeamSlot','renderDraftBoard',
    'removeDraftTeam','startDrag','allowDrop','dropPlayer'];
  modalFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Modals[k] = window[k]; });

  ns.Players = {};
  var playerFns = [    'destroyProfileCharts','closeProfile','refreshPlayerRank','refreshPlayerStats','openProfile',
    'showEmpty','hideEmpty','openDiscordIdGuide','updateFormPoints','selectRegType',
    'toggleTeamNameInput','autoFillRegisterForm','lookupRiotIdForRegister','handleRegistration',
    'loadCaptainDashboard','populateRankSelect','loadPlayerProfile','loadProfileEloChart',
    'profileEloChartInstance','loadProfileAchievements','openProfileEdit','closeProfileEdit',
    'saveProfileEdit','loadProfileAgents'];
  playerFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Players[k] = window[k]; });

  ns.Dashboard = {};
  var dashFns = ['lookupPlayer','lookupTeam'];
  dashFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Dashboard[k] = window[k]; });

  ns.Teams = {};
  var teamFns = ['pendingRequestsMap','getSubstitutes','isPlayerSubstitute','getActivePts',
    'toggleSubstituteRole','openTeamDetail','closeTeamDetail','openCreateTeamModal',
    'closeCreateTeamModal','submitCreateTeam','confirmKickMember','loadPendingTeams',
    'approveTeam','rejectTeam','loadTeamsBrowser','currentPlayerTeam','allTeams',
    'requestJoinTeam','cancelJoinRequest','approveJoinRequest','rejectJoinRequest',
    'renameTeam','leaveTeam','removeMember','disbandMyTeam','adminDraftTeams',
    'confirmDraftTeams','loadCompleteTeams','adminAddToTeam','adminKickMember',
    'adminRenameTeam','deleteTeam','disbandTeam','currentViewingTeam','changeCaptain'];
  teamFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Teams[k] = window[k]; });

  ns.Admin = {};
  var adminFns = ['adminSelectedPlayers','adminPlayerList','adminRefreshPlayers',
    'adminRenderPlayers','adminUpdateBulkActions','adminToggleAll','adminTogglePlayer',
    'adminBulkAssignTeam','adminBulkDelete','removePlayer','openAddPlayerModal',
    'closeAddPlayerModal','adminSaveNewPlayer','openEditPlayerModal','adminRefreshRank',
    'adminTeamData','adminTeamModalName','adminLoadTeams','adminRefreshTeams',
    'adminRenderTeamCards','adminOpenTeamModal','adminCloseTeamModal','adminCreateTeam',
    'adminAddMemberToTeam','adminKickMember','adminRenameCurrentTeam','adminDeleteCurrentTeam',
    'adminScoreReports','loadScoreReports','adminRenderReports','adminApproveReport',
    'adminRejectReport','adminMatchList','adminRefreshMatchList','adminRenderMatches',
    'openGenerateMatchesModal','closeGenerateMatchesModal','adminGenerateMatches',
    'openAdminMatchModal','closeAdminMatchModal','adminSaveMatch','adminDeleteMatch',
    'loadAdminDashboard','_dashRankChart','_dashWinsChart','adminLoadSettings',
    'adminSaveSettings','adminResetTournament','renderAdmin'];
  adminFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Admin[k] = window[k]; });

  ns.Schedule = {};
  var schedFns = ['switchScheduleSubTab','renderSchedule','toggleScheduleFullscreen',
    'updateAllCountdowns','loadSchedule','generateSwissRound','generateSchedule',
    'openVodModal','closeVodModal'];
  schedFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Schedule[k] = window[k]; });

  ns.Bracket = {};
  var bracketFns = ['loadBracket','generatePlayoff'];
  bracketFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Bracket[k] = window[k]; });

  ns.Veto = {};
  var vetoFns = ['vetoLabel','openVetoForMatch','loadVetoMatches','onSelectVetoMatch',
    'startVeto','renderVetoBoard','vetoAction'];
  vetoFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Veto[k] = window[k]; });

  ns.Stream = {};
  var streamFns = ['currentStreamSession','currentStreamMatch','streamCasters',
    'loadStreamArchive','loadStreamBooth','renderStreamIdle','renderStreamLive',
    'updateObsCasters','updateObsWidgetUrl','copyObsWidgetUrl','embedStreamUrl',
    'loadStreamMatchSelect','startStream','stopStream','updateStreamScore',
    'loadStreamKDA','addCaster','deleteCaster','renderCasters'];
  streamFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Stream[k] = window[k]; });

  ns.Notifications = {};
  var notifFns = ['initNotifications','updateNotifBadge','toggleNotifPanel','renderNotifList',
    'markAllNotifRead'];
  notifFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Notifications[k] = window[k]; });

  ns.Profile = {};
  var profFns = ['openProfile','closePlayerProfile'];
  profFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.Profile[k] = window[k]; });

  ns.App = {};
  var appFns = ['evan','switchTab','switchAdminSubTab','initPage','reconnectSocket',
    'renderStandings','renderRoundRobin','renderSwissBracket','renderTeams',
    'renderMatches','renderPlayers','renderScoreboard','renderPenalties','renderArchive',
    'renderStream','renderCast','renderScheduleMatchList','openPlayerProfile',
    'lookupTeam','openMatchDetailFromSchedule'];
  appFns.forEach(function(k) { if (typeof window[k] !== 'undefined') ns.App[k] = window[k]; });
})();
