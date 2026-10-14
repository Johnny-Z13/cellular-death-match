# Merge census: raw output

Unedited stdout of the census probe. The judgment write-up goes in `docs/v1/merge-census.md`; the same numbers, with the overall table, are in `docs/v1/merge-census.json`.

- Command: `npx vite-node scripts/merge-census.ts -- --seeds 12 --seconds 180 --json docs/v1/merge-census.json`
- Run: 2026-10-15, 397 s wall, 12 seeds x 180 game seconds x 7 dishes, one scan every 10 ticks (90,720 scans), sets of 2-4 cultures.
- Code: `src/game/contactGraph.ts` and `scripts/merge-census.ts` from this branch, on top of `v1/friends-and-merges` (c117cfb) so the title dish and open-lab life cycle exist.
- Times are game seconds at 60 ticks/s. The title dish runs at half speed on screen, so its holds look twice as long there.

```text

trial1: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  splitter,swarmlet|0-1                                          25     19     19     19    64.5    180.0       72%     12
  mirror,swarmlet|0-1                                            15     14     14     14   180.0    180.0       60%     11
  needle_swarm,sniper|0-1                                        12     12     12     12   180.0    180.0       92%     12
  swarmlet,swarmlet|0-1                                          10      9      7      5    25.0    174.0       40%      6
  mirror,swarmlet,swarmlet|0-1,0-2,1-2                            6      4      4      3    14.2    165.3      100%      3
  bloom_mass,swarmlet|0-1                                         4      3      3      2    14.2    107.2       75%      1
  splitter,splitter|0-1                                           3      3      3      3   165.8    166.2       33%      3
  sniper,swarmlet|0-1                                             5      2      2      1     1.8     55.2       40%      3
  splitter,splitter,swarmlet|0-1,0-2,1-2                          3      2      2      2    48.2    101.8      100%      2
  splitter,splitter,swarmlet|0-1,0-2                              3      2      2      2    64.5    101.2      100%      2
  needle_swarm,sniper,splitter,swarmlet|0-1,0-2,0-3,1-2,2-3       3      2      2      2    39.3     61.5      100%      1
  needle_swarm,sniper,splitter|0-1,0-2,1-2                        3      2      2      2    39.3     61.5        0%      1
  needle_swarm,splitter,swarmlet|0-1,0-2,1-2                      3      2      2      2    39.3     61.5        0%      1
  needle_swarm,splitter|0-1                                       3      2      2      2    39.3     61.5        0%      1
  bruiser,swarmlet|0-1                                            2      2      1      1   140.7    140.7      100%      2
  needle_swarm,sniper,swarmlet|0-1,0-2                            3      1      1      1     1.7    101.0       33%      2
  needle_swarm,splitter,swarmlet|0-2,1-2                          3      1      1      1     0.8     18.3        0%      1
  needle_swarm,sniper,splitter|0-1,1-2                            3      1      1      1     0.8      8.7        0%      1
  needle_swarm,sniper,swarmlet|0-1,1-2                            2      1      1      1    18.3     18.3      100%      2
  needle_swarm,swarmlet|0-1                                       2      1      1      1   139.2    139.2        0%      2
  needle_swarm,sniper,swarmlet|0-1,0-2,1-2                        2      1      1      1    36.8     36.8       50%      1
  needle_swarm,sniper,splitter,swarmlet|0-1,0-3,1-2,1-3,2-3       2      1      1      1     8.5      8.5      100%      1
  sniper,splitter,swarmlet|0-1,0-2,1-2                            2      1      1      1     8.5      8.5        0%      1
  sniper,splitter,swarmlet|0-1,1-2                                2      1      1      1   101.0    101.0        0%      1
  bruiser,mirror|0-1                                              1      1      1      1    11.8     11.8        0%      1
  bruiser,mirror,swarmlet|0-1,0-2                                 1      1      1      0     7.3      7.3      100%      1
  bloom_mass,splitter,swarmlet|0-1,0-2,1-2                        1      1      1      0     5.2      5.2      100%      1
  bloom_mass,splitter|0-1                                         1      1      1      1    18.8     18.8      100%      1
  bruiser,splitter|0-1                                            1      1      1      1    18.0     18.0      100%      1
  sniper,splitter,swarmlet|0-2,1-2                                1      1      1      1     9.7      9.7        0%      1

trial2: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  swarmlet,swarmlet|0-1                                         226     14      7      0     0.5      6.7       82%     12
  bloom_mass,splitter|0-1                                         5      4      3      0     4.0      6.0       20%      3
  bruiser,bruiser|0-1                                            60      2      2      0     0.3      5.0       88%      3
  mirror,mirror|0-1                                              21      2      2      0     0.3      5.2      100%      1
  bruiser,control|0-1                                             3      2      2      0     5.2      6.2      100%      3
  mirror,splitter|0-1                                            21      6      1      0     1.0      5.0       38%     11
  splitter,swarmlet|0-1                                          71      3      1      0     0.7      5.2       58%     10
  bruiser,swarmlet|0-1                                           35      2      1      0     0.3      5.2       74%      3
  bloom_mass,bloom_mass|0-1                                       9      2      1      0     1.0      5.3       78%      2
  bloom_mass,swarmlet|0-1                                        20      2      0      0     0.8      3.3       55%      3
  splitter,splitter|0-1                                          17      2      0      0     0.8      2.3       65%      7
  mirror,needle_swarm|0-1                                        11      2      0      0     0.5      2.3       55%      7
  bruiser,splitter|0-1                                            5      2      0      0     1.0      3.7       40%      5
  bruiser,mirror|0-1                                              2      2      0      0     2.3      2.3        0%      2
  bloom_mass,bloom_mass,splitter,swarmlet|0-1,0-2,0-3,1-2,2-3      2      1      0      0     2.0      2.0      100%      1
  bloom_mass,bloom_mass,swarmlet|0-1,0-2                          2      1      0      0     2.0      2.0        0%      1
  bloom_mass,bloom_mass,splitter|0-1,0-2,1-2                      1      1      0      0     2.8      2.8        0%      1
  swarmlet,swarmlet,swarmlet|0-1,0-2                             32      0      0      0     0.2      0.7        9%      2
  swarmlet,swarmlet,swarmlet|0-1,0-2,1-2                         30      0      0      0     0.3      1.5       23%      4
  mirror,swarmlet|0-1                                            16      0      0      0     0.3      1.3       56%      6
  bloom_mass,splitter,swarmlet|0-1,0-2,1-2                       10      0      0      0     0.8      1.8       60%      3
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3        10      0      0      0     0.2      0.3       80%      1
  bloom_mass,splitter,swarmlet|0-1,1-2                            9      0      0      0     0.5      1.7       67%      3
  mirror,needle_swarm,splitter|0-1,0-2                            9      0      0      0     0.7      1.8       67%      5
  mirror,splitter,splitter|0-1,1-2                                7      0      0      0     0.2      1.0       43%      3
  splitter,swarmlet,swarmlet|0-1,0-2,1-2                          7      0      0      0     0.5      0.8       57%      4
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3      7      0      0      0     0.2      0.5      100%      1
  splitter,splitter,swarmlet|0-1,0-2                              6      0      0      0     0.2      0.5       83%      5
  bruiser,swarmlet,swarmlet|0-1,0-2                               6      0      0      0     0.5      0.5       17%      1
  splitter,splitter,swarmlet|0-1,0-2,1-2                          5      0      0      0     0.3      0.7       80%      4

trial3: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  swarmlet,swarmlet|0-1                                         255     18      8      1     0.3     10.2       88%     11
  bruiser,bruiser|0-1                                            42      4      2      0     0.3      6.2       74%      3
  mirror,mirror|0-1                                              35      2      2      0     0.3      5.2       94%      2
  mirror,sniper|0-1                                              14      3      1      0     1.2      4.0       64%      9
  swarmlet,swarmlet,swarmlet|0-1,0-2,1-2                         11      2      1      0     0.3      4.0       91%      7
  bruiser,splitter|0-1                                            4      1      1      0     1.0      4.2       50%      4
  splitter,splitter|0-1                                           3      1      1      0     0.3      4.2      100%      2
  bruiser,swarmlet|0-1                                           61      3      0      0     0.5      2.5       64%      8
  bruiser,mirror|0-1                                              8      2      0      0     1.2      2.7       13%      3
  mirror,swarmlet|0-1                                            15      1      0      0     0.3      2.2       53%      6
  needle_swarm,sniper|0-1                                         6      1      0      0     0.5      3.7       33%      5
  mirror,splitter|0-1                                             2      1      0      0     2.2      2.2        0%      2
  bruiser,swarmlet,swarmlet|0-1,0-2                              14      0      0      0     0.3      0.7       71%      1
  splitter,swarmlet|0-1                                          13      0      0      0     0.5      1.0       46%      4
  mirror,needle_swarm|0-1                                        10      0      0      0     0.3      1.5       60%      6
  swarmlet,swarmlet,swarmlet|0-1,0-2                              8      0      0      0     0.3      0.3       50%      5
  bruiser,bruiser,mirror|0-1,0-2,1-2                              8      0      0      0     0.7      1.5       38%      1
  sniper,swarmlet|0-1                                             7      0      0      0     0.5      0.8       71%      4
  sniper,sniper|0-1                                               7      0      0      0     0.2      1.3       86%      3
  sniper,splitter|0-1                                             5      0      0      0     0.5      0.7       80%      3
  mirror,needle_swarm,sniper|0-1,0-2,1-2                          4      0      0      0     0.2      0.3        0%      3
  mirror,needle_swarm,sniper|0-1,0-2                              4      0      0      0     0.2      0.5       25%      4
  bruiser,swarmlet,swarmlet|0-1,1-2                               4      0      0      0     0.2      0.2      100%      2
  bruiser,bruiser,bruiser|0-1,0-2                                 4      0      0      0     0.2      0.3       25%      2
  bruiser,bruiser,bruiser|0-1,0-2,1-2                             4      0      0      0     0.2      0.3       25%      2
  bruiser,bruiser,swarmlet|0-1,0-2                                4      0      0      0     0.5      0.8      100%      2
  needle_swarm,swarmlet|0-1                                       4      0      0      0     0.3      1.0       50%      3
  bruiser,bruiser,mirror|0-1,0-2                                  3      0      0      0     0.2      0.3      100%      1
  bruiser,bruiser,bruiser,mirror|0-1,0-2,0-3,1-3,2-3              3      0      0      0     0.2      0.2      100%      1
  bruiser,bruiser,mirror|0-2,1-2                                  3      0      0      0     0.2      0.2        0%      1

trial4: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  swarmlet,swarmlet|0-1                                         248     17     13      3     0.3     11.0       75%     10
  splitter,swarmlet|0-1                                         161      8      4      0     0.7      5.5       66%     11
  bloom_mass,splitter|0-1                                         7      7      4      0     4.0      5.2        0%      6
  bloom_mass,swarmlet|0-1                                        15      6      4      0     1.2      5.0       13%      6
  mirror,splitter|0-1                                            24      4      4      0     0.8      5.2       50%     11
  bloom_mass,splitter,swarmlet|0-1,0-2,1-2                       18      5      2      0     0.8      4.8       33%      6
  swarmlet,swarmlet,swarmlet|0-1,0-2,1-2                         19      2      2      0     0.3      4.3       68%      7
  splitter,splitter|0-1                                          49      3      1      0     0.7      6.2       86%      9
  mirror,needle_swarm|0-1                                         7      3      1      0     0.8      5.7       43%      6
  bruiser,splitter|0-1                                           13      2      1      0     1.2      7.0       23%      7
  bruiser,mirror|0-1                                              8      2      1      0     1.7      4.8       13%      6
  mirror,swarmlet|0-1                                            21      1      1      0     0.3      4.0       43%      6
  mirror,splitter,swarmlet|0-1,0-2,1-2                            4      1      1      0     0.2      4.0       50%      3
  needle_swarm,splitter|0-1                                       7      1      0      0     0.7      2.0       29%      4
  mirror,needle_swarm,splitter|0-1,0-2                            6      1      0      0     0.5      2.0       67%      4
  bloom_mass,mirror,splitter|0-1,0-2,1-2                          4      1      0      0     1.2      2.7        0%      1
  bloom_mass,mirror|0-1                                           4      1      0      0     1.2      2.7        0%      1
  bruiser,control|0-1                                             3      1      0      0     1.7      2.5       33%      3
  bloom_mass,mirror,splitter,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3      2      1      0      0     2.7      2.7        0%      1
  bloom_mass,mirror,swarmlet|0-1,0-2,1-2                          2      1      0      0     2.7      2.7        0%      1
  sniper,splitter|0-1                                             1      1      0      0     2.8      2.8        0%      1
  splitter,swarmlet,swarmlet|0-1,0-2,1-2                         25      0      0      0     0.3      1.2       36%      8
  splitter,swarmlet,swarmlet|0-1,0-2                             24      0      0      0     0.2      0.7       54%      6
  bruiser,bruiser|0-1                                            20      0      0      0     0.2      0.8      100%      1
  swarmlet,swarmlet,swarmlet|0-1,0-2                             19      0      0      0     0.2      0.8       53%      7
  bruiser,swarmlet|0-1                                           15      0      0      0     0.3      1.5       60%      4
  mirror,mirror|0-1                                              13      0      0      0     0.5      1.0      100%      1
  bloom_mass,splitter,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3     12      0      0      0     0.3      1.0       58%      1
  splitter,swarmlet,swarmlet|0-1,1-2                             11      0      0      0     0.2      0.5       36%      5
  bloom_mass,splitter,swarmlet|0-1,1-2                           10      0      0      0     0.2      0.7       50%      5

trial5: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  boss,bruiser|0-1                                               48     31     21      8     3.3     14.2       17%     11
  bruiser,bruiser|0-1                                            78     18     12      2     0.5      9.7       65%      9
  boss,swarmlet|0-1                                              76     22     10      0     1.3      7.0       62%      8
  bruiser,splitter|0-1                                           32     14      6      1     1.2     10.8       34%      9
  swarmlet,swarmlet|0-1                                         112     13      6      1     0.5      8.2       78%      9
  mirror,sniper|0-1                                              26      9      5      0     1.2      6.7       23%     12
  boss,bruiser,bruiser|0-1,0-2,1-2                               15      8      5      0     2.3      7.7       20%      7
  boss,boss|0-1                                                   6      6      4      2     6.8      8.5       17%      2
  bruiser,swarmlet|0-1                                           61      8      3      0     0.7      7.7       36%     11
  boss,bruiser,sniper|0-1,0-2                                     8      4      3      0     2.3      6.2       38%      4
  bloom_mass,splitter|0-1                                         3      3      3      0     5.3      7.8        0%      2
  splitter,swarmlet|0-1                                          80     13      2      0     1.2      7.2       53%     12
  mirror,splitter|0-1                                            20     11      2      0     2.8      6.5       15%     11
  sniper,splitter|0-1                                            25      9      2      1     1.2     10.3       12%     11
  needle_swarm,sniper|0-1                                        11      6      2      0     2.5      5.5       18%      8
  boss,bruiser,bruiser|0-1,1-2                                   22      5      2      1     0.5      9.2       27%      7
  boss,splitter|0-1                                              10      5      2      0     2.3      7.2       30%      6
  needle_swarm,splitter|0-1                                      13      3      2      0     0.8      4.5       62%      5
  boss,sniper|0-1                                                 5      3      2      0     3.3      6.2        0%      5
  boss,boss,bruiser|0-1,0-2,1-2                                  14      4      1      0     0.7      6.8        0%      2
  bloom_mass,splitter,swarmlet|0-1,0-2,1-2                       13      4      1      0     1.2      5.2       31%      2
  bloom_mass,swarmlet|0-1                                         7      3      1      0     1.7      5.5        0%      2
  boss,bruiser,swarmlet|0-1,1-2                                  24      2      1      0     0.8      6.0       13%      6
  boss,bruiser,bruiser|0-1,0-2                                   10      2      1      0     0.8      5.2       20%      2
  bruiser,bruiser,bruiser|0-1,0-2                                10      2      1      0     0.3      4.3        0%      3
  boss,bruiser,splitter|0-1,1-2                                   8      2      1      0     1.3      4.7       38%      5
  boss,bruiser,bruiser,sniper|0-1,0-2,0-3,1-2                     2      2      1      0     6.2      6.2        0%      2
  bruiser,bruiser,splitter|0-1,0-2,1-2                           15      1      1      0     0.3      4.3       13%      6
  bruiser,bruiser,splitter|0-1,0-2                               12      1      1      0     0.3      5.3        8%      6
  boss,bruiser,bruiser,sniper|0-1,0-3,1-2                         4      1      1      0     1.0      4.3        0%      2

openlab: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  swarmlet,swarmlet|0-1                                        7871   2767   1754    843     0.8     97.3        0%     12
  swarmlet,swarmlet,swarmlet|0-1,0-2,1-2                      16169   2611    998    241     0.5     47.7        0%     12
  bruiser,swarmlet|0-1                                         3806   1376    796    302     1.0     50.8        0%     12
  swarmlet,swarmlet,swarmlet|0-1,0-2                          34269   2920    646     98     0.3     21.5        0%     12
  splitter,swarmlet|0-1                                        2441    881    570    279     0.8     98.7        0%     12
  splitter,swarmlet,swarmlet|0-1,0-2,1-2                       6549   1130    460    123     0.5     74.8        0%     12
  splitter,swarmlet,swarmlet|0-1,1-2                          10747   1293    397     54     0.3     20.5        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,1-3             17213   1329    357     40     0.3     16.3        0%     12
  bruiser,swarmlet,swarmlet|0-1,1-2                           14543   1278    294     21     0.3     18.0        0%     12
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2         56339   1868    270     22     0.3     13.0        0%     12
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,1-3             47705   1624    266     45     0.3     18.5        0%     12
  bruiser,swarmlet,swarmlet|0-1,0-2,1-2                        8427    991    227     17     0.5     11.8        0%     12
  bruiser,bruiser,swarmlet|0-1,0-2                             6346    795    211     27     0.5     26.5        0%     12
  bruiser,bruiser|0-1                                           717    351    209     87     1.8     50.0        0%     12
  splitter,swarmlet,swarmlet|0-1,0-2                           4843    569    191     44     0.3     25.2        0%     12
  bloom_mass,swarmlet,swarmlet|0-1,1-2                         3668    502    168     31     0.5     34.7        0%      6
  bruiser,swarmlet,swarmlet|0-1,0-2                            6263    688    167     17     0.3     12.8        0%     12
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3  11876    645    148     15     0.3     15.7        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2          8073    538    147     31     0.3     14.7        0%     12
  bloom_mass,swarmlet|0-1                                       635    212    139     80     0.8    109.2        0%      6
  bruiser,splitter,swarmlet|0-1,0-2                            2301    404    135     20     0.5     13.2        0%     12
  bloom_mass,swarmlet,swarmlet|0-1,0-2,1-2                     1891    310    132     49     0.5     25.8        0%      6
  bruiser,splitter|0-1                                          418    193    130     67     1.5     42.3        0%     12
  bruiser,bruiser,swarmlet|0-1,0-2,1-2                         3535    473    127     14     0.5     12.8        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,1-2,1-3,2-3          9737    562    124      7     0.3     13.3        0%     12
  mirror,swarmlet|0-1                                           465    164    116     65     0.8     81.7        0%      7
  bruiser,splitter,swarmlet|0-1,0-2,1-2                        2085    303    102     15     0.5     20.3        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,1-2,2-3             13292    557    101     13     0.3     11.3        0%     12
  bloom_mass,swarmlet,swarmlet,swarmlet|0-1,0-2,1-3            6475    401     93     13     0.3     17.8        0%      6
  mirror,mirror|0-1                                             310    143     92     39     1.5     45.8        1%      5

title: 12 seeds x 180s, sets of 2-4, top 30 by holds of 4 s or more
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  swarmlet,swarmlet|0-1                                        2323    935    737    540     1.0    174.3        0%     12
  swarmlet,swarmlet,swarmlet|0-1,0-2,1-2                       3711   1063    665    314     0.7     63.8        0%     12
  splitter,swarmlet,swarmlet|0-1,0-2,1-2                       4176   1078    606    275     0.5     62.7        1%     12
  splitter,swarmlet|0-1                                        1583    582    429    300     0.7    178.3        0%     12
  splitter,swarmlet,swarmlet|0-1,1-2                           5075    969    379    107     0.5     27.7        0%     12
  sniper,swarmlet,swarmlet|0-1,1-2                             2007    473    227     69     0.5     32.7        0%     12
  sniper,splitter,swarmlet|0-1,1-2                              937    314    194     99     0.7     78.2        0%     12
  sniper,swarmlet|0-1                                           604    237    184    127     1.0    178.8        1%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3   3259    473    183     45     0.3     53.2        2%     12
  swarmlet,swarmlet,swarmlet|0-1,0-2                           5251    626    167     22     0.5     17.0        0%     12
  splitter,swarmlet,swarmlet|0-1,0-2                           1992    369    161     55     0.3     33.8        2%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,1-2,1-3,2-3      4667    554    148     22     0.3     22.7        1%     12
  sniper,splitter,swarmlet,swarmlet|0-1,1-2,1-3,2-3            1404    299    141     37     0.5     34.3        0%     12
  swarmlet,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3,2-3   1894    303    124     24     0.5     17.7        0%     11
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,1-3              2696    349    116     23     0.3     22.5        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2          2082    295    106     22     0.3     24.2        0%     12
  sniper,swarmlet,swarmlet|0-1,0-2,1-2                          936    220    106     22     0.5     23.8        0%     12
  sniper,splitter,swarmlet,swarmlet|0-1,1-2,2-3                1497    262     93     26     0.5     22.5        0%     11
  sniper,splitter,swarmlet|0-1,0-2,1-2                          576    154     92     47     0.5     32.7        0%     12
  mirror,swarmlet|0-1                                           241    119     87     47     1.8    178.5        1%     12
  sniper,swarmlet,swarmlet,swarmlet|0-1,1-2,1-3,2-3            1641    263     77     13     0.5     16.3        0%     12
  bruiser,swarmlet|0-1                                          178     91     69     43     2.2     38.0        3%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,1-2,1-3,2-3          2265    222     62     14     0.3     13.5        1%     12
  splitter,splitter,swarmlet,swarmlet|0-1,0-2,1-3               493    112     62     24     0.5     47.8        0%      4
  splitter,splitter,swarmlet|0-1,0-2                            306     98     60     28     0.7     47.8        0%      4
  sniper,splitter,swarmlet|0-2,1-2                              326     91     52     20     0.5     29.0        0%     12
  splitter,swarmlet,swarmlet,swarmlet|0-1,0-2,0-3,1-2,1-3      2586    213     49      5     0.3     11.3        1%     12
  sniper,splitter,swarmlet,swarmlet|0-1,0-2,1-2,1-3,2-3        1065    144     47      8     0.3     18.2        0%     12
  sniper,splitter|0-1                                            96     54     47     38     3.8    140.5        0%     12
  splitter,splitter,swarmlet,swarmlet|0-1,0-2,0-3,2-3           421     93     45      9     0.7     29.5        0%      4

Two red cultures around one green Splitter (sniper, control, boss), every dish:
 trial1: none seen
 trial2: none seen
 trial3: none seen
 trial4: none seen
 trial5
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  boss,sniper,splitter|0-1,0-2,1-2                                3      0      0      0     0.8      1.2        0%      1
  boss,sniper,splitter|0-1,1-2                                    3      0      0      0     0.2      0.5        0%      1
  boss,boss,splitter|0-1,0-2                                      2      0      0      0     0.3      0.3        0%      1
  boss,boss,splitter|0-1,0-2,1-2                                  2      0      0      0     0.3      0.3        0%      1
  boss,sniper,splitter|0-1,0-2                                    1      0      0      0     0.3      0.3        0%      1
 openlab
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  control,sniper,splitter|0-2,1-2                                 4      1      1      0     0.5      5.3        0%      1
  control,sniper,splitter|0-1,0-2                                 3      1      1      0     0.3      6.8        0%      1
 title
  shape                                                         eps   >=2s   >=4s   >=8s  median  longest  isolated  seeds
  sniper,sniper,splitter|0-1,0-2                                  8      7      5      5    13.3     79.5        0%      3
  control,sniper,splitter|0-1,1-2                                 7      4      2      0     2.8      4.5        0%      2
  control,sniper,splitter|0-2,1-2                                 2      2      2      1    10.0     10.0        0%      1
  sniper,sniper,splitter|0-2,1-2                                  2      1      1      0     4.3      4.3        0%      1
  control,sniper,splitter|0-1,0-2,1-2                             1      0      0      0     0.5      0.5        0%      1

legend: shape = sorted strain labels | touching pairs by position. "isolated" = share of holds where the set was a whole contact group, not part of a bigger cluster.
scan cost 0.552 ms average over 90720 scans (merge detection budget: 0.3 ms). 397s wall
wrote docs/v1/merge-census.json
```
