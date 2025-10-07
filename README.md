# blockchain

# Yearly: warning, critical (solution: update database: due date)
# [ ] => scheduler => kafka producer 
#                             <!-- "=> user system (VN team) => webtrade (notification) =>"  -->
#                                                                                             rekyc flow (web)
# Special EDD
# <!-- [ ] => admin => webtrade (notification) =>  -->
#                                             rekyc flow (web)
# 
# Customer changes  (solution: mock data producer)
# <!-- [ ] => customer profile => kafka producer  -->
# [ ]         => kafka consumer => check risks => kafka producer =>
#             <!-- user system (VN team) => if yes => webtrade (notification) => -->
#             rekyc flow (web)
# CDD changes (solution: mock data call webhook api)
# [ ] => appman webhook => check risks => kafka producer => 
#             <!-- user system (VN team) => if yes => webtrade (notification) => -->
#             rekyc flow (web)
# common
# [x] => rekyc flow (web)  => kafka producer => user system (VN team)
# [x]                     => admin backoffice => approval processes (3 steps) => kafka producer => user system (VN team)