/**
 * IELTS Academic — TryOut 11 September 2026
 *
 * DIBUAT MESIN oleh `scripts/ekspor-paket-ielts.mjs` — jangan disunting tangan.
 * Sunting paketnya lewat panel admin atau skrip penyemainya, lalu ekspor ulang:
 *
 *     npm run ekspor:ielts -- IELTS-11SEP2026
 *
 * Kenapa berkas ini ada sama sekali: lihat `../paket-bawaan.ts`.
 */

import type { PaketBawaan } from "./tipe";

const paket: PaketBawaan = {
 "kode": "IELTS-11SEP2026",
 "nama": "IELTS Academic — TryOut 11 September 2026",
 "deskripsi": "Listening 40 butir (empat rekaman) dan Reading 40 butir (tiga bacaan). Writing dan Speaking tidak diujikan pada sesi ini.",
 "status": "published",
 "mulai_at": "2026-09-10T17:00:00.000Z",
 "selesai_at": "2026-09-11T16:59:00.000Z",
 "menit": {
  "listening": null,
  "reading": null,
  "writing": null,
  "speaking": null
 },
 "folderAudio": "ielts-11sep2026",
 "seksi": [
  {
   "subtes": "LISTENING",
   "nomor": 1,
   "judul": "Section 1 — Office furniture order",
   "instruksi": "Questions 1–5\nComplete the form below.\nWrite NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.\n\nQuestions 6–10\nComplete the table below.\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": "c461f4df9d2aafb6.mp3",
   "audioNama": "Section 1 (track 20)"
  },
  {
   "subtes": "LISTENING",
   "nomor": 2,
   "judul": "Section 2 — Marathon: tips for spectators",
   "instruksi": "Questions 11–17\nComplete the sentences below.\nWrite NO MORE THAN TWO WORDS for each answer.\n\nQuestions 18–20\nWhat does the speaker say about the following forms of transport?\nWrite the correct letter, A, B, C, D or E, for each answer.\n\nA  Will take more passengers than usual\nB  Will suit people who want to see the start of the race\nC  Waiting times will be longer than usual\nD  Will have fewer staff than usual\nE  Some work schedules will change",
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": "8a6734e6c13b4c1d.mp3",
   "audioNama": "Section 2 (track 21)"
  },
  {
   "subtes": "LISTENING",
   "nomor": 3,
   "judul": "Section 3 — Ahmed and his tutor discuss seminars",
   "instruksi": "Questions 21–26\nChoose the correct letter, A, B or C.\n\nQuestions 27–28\nChoose TWO letters, A–E.\nWhich TWO strategies does the tutor suggest for the next seminar?\n\nA  Speak more frequently\nB  Behave in a confident manner\nC  Sit next to someone helpful\nD  Listen to what other people say\nE  Think of questions to ask\n\nQuestions 29–30\nChoose TWO letters, A–E.\nWhich TWO suggestions does the tutor make about taking notes?\n\nA  Plan them before the seminar\nB  Note down key words that people say\nC  Note points to say later\nD  Include self-analysis\nE  Rewrite them after the seminar\n\nPENTING untuk nomor 27–30: tulis kedua hurufnya BERURUT ABJAD — huruf\nyang lebih awal di nomor yang lebih kecil. Contoh: bila jawabanmu B dan A,\ntulis A pada nomor pertama dan B pada nomor kedua.",
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": "cc4d7109c3bc621e.mp3",
   "audioNama": "Section 3 (track 22)"
  },
  {
   "subtes": "LISTENING",
   "nomor": 4,
   "judul": "Section 4 — Desert plants",
   "instruksi": "Questions 31–40\nComplete the notes below.\nWrite NO MORE THAN TWO WORDS for each answer.",
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": "de4cedbf32b117b6.mp3",
   "audioNama": "Section 4 (track 23)"
  },
  {
   "subtes": "READING",
   "nomor": 1,
   "judul": "Passage 1 — Domestic Robots",
   "instruksi": "You should spend about 20 minutes on Questions 41–53.\n\nQuestions 41–46\nDo the following statements agree with the information given in Reading Passage 1?\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n\nQuestions 47–50\nAnswer the questions below.\nUse NO MORE THAN THREE WORDS from the passage for each answer.\n\nQuestions 51–53\nComplete the labels for the Rovio surveillance robot.\nChoose NO MORE THAN THREE WORDS from the passage for each answer.",
   "bacaan": "Machines that look after your home are getting cleverer, but they still need care and attention if they are to perform as intended.\n\nFloor-cleaning machines capable of responding to their environment were among the first commercially available domestic products worthy of being called robots. The best known is the Roomba, made by iRobot, an American company which has sold more than three million of the disc-shaped, frisbee-sized vacuuming robots. The latest model, the fifth version of the Roomba, has more sensors and cleverer software than its predecessors. Press the 'Clean' button and the robot glides out of its docking station and sets off across the floor.\n\nDomestic robots are supposed to free up time so that you can do other things, but watching how the Roomba deals with obstacles is strangely compelling. It is capable of sensing its surroundings, and does not simply try to adhere to a pre-planned route, so it is not upset if furniture is moved, or if it is picked up and taken to clean another room. Its infra-red sensors enable it to slow down before reaching an obstacle – such as a dozy cat – changing direction and setting off again.\n\nIt steadily works its way around the room, figuring out how to get out from under the television stand or untangle itself from a stray Game Boy recharging lead. Watch it for long enough, and you can sometimes predict its next move. The machine has a 'dirt sensor' and flashes a blue light when it finds things to clean up. Only when it detects no more dirt does it stop going over the same area and, eventually, conclude that the whole room is clean. It then trundles back to dock at its recharging station.\n\nSo the first observation of life with a domestic robot is that you will keep watching it before you trust it completely. Perhaps that is not surprising: after all, when automatic washing machines first appeared, people used to draw up a chair and sit and watch them complete their wash, rinse and spin cycles. Now they just load them, switch them on and leave them to it.\n\nThe second observation is that, despite their current level of intelligence, certain allowances must be made to get the best out of a domestic robot. The Roomba can be set up to clean at particular times, and to clean more than one room (small infra-red 'lighthouses' can be positioned in doorways, creating an invisible barrier between one room and the next that is only removed when the first room has been cleaned). A 'drop-off sensor' underneath the robot prevents it from falling down stairs. All very clever, but what the Roomba will not do is pick up toys, shoes and other items left lying around. Rooms cared for by robots must be kept tidy. To start with, children will happily put things away in order to watch the robot set off, but unfortunately the novelty soon wears off.\n\nSimilar allowances must be made for other domestic robots. Sweden's Husqvarna recently launched a new version of its Automower lawn mowing robot. Before it can be used, a wire must be placed around the perimeter of the lawn to define the part to be cut. If toys and other obstacles are not cleared from the lawn before it starts work, the robot will steer around them, leaving uncut areas. However, the latest version can top up its batteries with solar power, or send its owner a text message if it gets into trouble trying to climb a mole-hill.\n\nBut there is still only a limited range of domestic robots. Machines that mop the floor, clean a swimming pool and clear muck from guttering are made by iRobot. Several surveillance robots are also on offer. The Rovio, made by WowWee of Hong Kong, is a wi-fi-enabled webcam, mounted on an extending arm, which rides along smoothly on a nimble set of three wheels. Its movement can be remotely operated over the Internet via a laptop or mobile phone. The idea is that Rovio can patrol the home when its owner is away, either automatically or under manual control: in the latter case, two-way communication allows the operator to see and talk via the machine. So you could, for instance, shout at the cat if it is sleeping on your best sofa.\n\nSome machines are called robots even though they cannot move around. There is an ironing robot, for instance, that resembles an inflatable dummy: put a damp shirt on it, and it puffs up to remove the creases. Similarly, there are elaborate trouser presses that aspire to be robots. But do these devices really count as robots? If so, then surely dishwashers and washing machines do, too.\n\nYet whatever shape or size robots come in, many will be adored. Another important observation from living with a robot is that it tends to become part of the family. 'People give them names, and if they have to be sent back for repair, they carefully add a mark to them to ensure they get the same machine back,' says Nancy Dussault Smith of iRobot.",
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "READING",
   "nomor": 2,
   "judul": "Passage 2 — Deforestation in the 21st century",
   "instruksi": "You should spend about 20 minutes on Questions 54–66.\n\nQuestions 54–59\nReading Passage 2 has seven paragraphs, A–G.\nWhich paragraph contains the following information?\nWrite the correct letter, A–G. You may use any letter more than once.\n\nQuestions 60–63\nChoose TWO letters, A–E, for each pair of questions.\n\nQuestions 60–61 — Which TWO of these reasons do experts give for current\npatterns of deforestation?\nA  to provide jobs\nB  to create transport routes\nC  to feed city dwellers\nD  to manufacture low-budget consumer items\nE  to meet government targets\n\nQuestions 62–63 — The list below gives some of the impacts of tropical\ndeforestation. Which TWO of these results are mentioned by the writer?\nA  local food supplies fall\nB  soil becomes less fertile\nC  some areas have new forest growth\nD  some regions become uninhabitable\nE  local economies suffer\n\nPENTING untuk nomor 60–63: tulis kedua hurufnya BERURUT ABJAD.\n\nQuestions 64–66\nComplete the sentences below.\nChoose NO MORE THAN TWO WORDS and/or A NUMBER from the passage.",
   "bacaan": "When it comes to cutting down trees, satellite data reveals a shift from the patterns of the past\n\nA\nGlobally, roughly 13 million hectares of forest are destroyed each year. Such deforestation has long been driven by farmers desperate to earn a living or by loggers building new roads into pristine forest. But now new data appears to show that big, block clearings that reflect industrial deforestation have come to dominate, rather than these smaller-scale efforts that leave behind long, narrow swaths of cleared land. Geographer Ruth DeFries of Columbia University and her colleagues used satellite images to analyse tree-clearing in countries ringing the tropics, representing 98 per cent of all remaining tropical forest. Instead of the usual 'fish bone' signature of deforestation from small-scale operations, large, chunky blocks of cleared land reveal a new motive for cutting down woods.\n\nB\nIn fact, a statistical analysis of 41 countries showed that forest loss rates were most closely linked with urban population growth and agricultural exports in the early part of the 21st century – even overall population growth was not as strong an influence. 'In previous decades, deforestation was associated with planned colonisation, resettlement schemes in local areas and farmers clearing land to grow food for subsistence,' DeFries says. 'What we're seeing now is a shift from small-scale farmers driving deforestation to distant demands from urban growth, agricultural trade and exports being more important drivers.'\n\nC\nIn other words, the increasing urbanisation of the developing world, as populations leave rural areas to concentrate in booming cities, is driving deforestation, rather than containing it. Coupled with this there is an ongoing increase in consumption in the developed world of products that have an impact on forests, whether furniture, shoe leather or chicken feed. 'One of the really striking characteristics of this century is urbanisation and rapid urban growth in the developing world,' DeFries says. 'People in cities need to eat.' 'There's no surprise there,' observes Scott Poynton, executive director of the Tropical Forest Trust, a Switzerland-based organisation that helps businesses implement and manage sustainable forestry in countries such as Brazil, Congo and Indonesia. 'It's not about people chopping down trees. It's all the people in New York, Europe and elsewhere who want cheap products, primarily food.'\n\nD\nDeFries argues that in order to help sustain this increasing urban and global demand, agricultural productivity will need to be increased on lands that have already been cleared. This means that better crop varieties or better management techniques will need to be used on the many degraded and abandoned lands in the tropics. And the Tropical Forest Trust is building management systems to keep illegally harvested wood from ending up in, for example, deck chairs, as well as expanding its efforts to look at how to reduce the 'forest footprint' of agricultural products such as palm oil. Poynton says, 'The point is to give forests value as forests, to keep them as forests and give them a use as forests. They're not going to be locked away as national parks. That's not going to happen.'\n\nE\nBut it is not all bad news. Halts in tropical deforestation have resulted in forest regrowth in some areas where tropical lands were previously cleared. And forest clearing in the Amazon, the world's largest tropical forest, dropped from roughly 1.9 million hectares a year in the 1990s to 1.6 million hectares a year over the last decade, according to the Brazilian government. 'We know that deforestation has slowed down in at least the Brazilian Amazon,' DeFries says. 'Every place is different. Every country has its own particular situation, circumstances and driving forces.'\n\nF\nRegardless of this, deforestation continues, and cutting down forests is one of the largest sources of greenhouse gas emissions from human activity – a double blow that both eliminates a biological system to suck up CO2 and creates a new source of greenhouse gases in the form of decaying plants. The United Nations Environment Programme estimates that slowing such deforestation could reduce some 50 billion metric tons of CO2, or more than a year of global emissions. Indeed, international climate negotiations continue to attempt to set up a system to encourage this, known as the UN Development Programme's fund for reducing emissions from deforestation and forest degradation in developing countries (REDD). 'If policies [like REDD] are to be effective, we need to understand what the driving forces are behind deforestation,' DeFries argues. This is particularly important in the light of new pressures that are on the horizon: the need to reduce our dependence on fossil fuels and find alternative power sources, particularly for private cars, is forcing governments to make products such as biofuels more readily accessible. This will only exacerbate the pressures on tropical forests.\n\nG\nBut millions of hectares of pristine forest remain to protect, according to this new analysis from Columbia University. Approximately 60 percent of the remaining tropical forests are in countries or areas that currently have little agricultural trade or urban growth. The amount of forest area in places like central Africa, Guyana and Suriname, DeFries notes, is huge. 'There's a lot of forest that has not yet faced these pressures.'",
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "READING",
   "nomor": 3,
   "judul": "Passage 3 — So you think humans are unique",
   "instruksi": "You should spend about 20 minutes on Questions 67–80.\n\nQuestions 67–71\nChoose the correct letter, A, B, C or D.\n\nQuestions 72–76\nDo the following statements agree with the claims of the writer?\nYES if the statement agrees with the claims of the writer\nNO if the statement contradicts the claims of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this\n\nQuestions 77–80\nComplete the summary using the list of words, A–H, below.\nWrite the correct letter, A–H, for each answer.\n\nBABBLING\nIt seems that humans are not the only species that babble. Before young\ninfants speak, some experts think that they produce the (77) ______\nmixture of human sounds. Over time, however, they copy the language of\ntheir parents, and this affects their ability to pronounce (78) ______\nsounds from other languages.\nA (79) ______ pattern has been found among dolphins. They produce a range\nof individual sounds when they are babies, and then combine some of these\nto produce the sounds of (80) ______ dolphins later on.\n\nA  Adult        B  Rare        C  Similar      D  Full\nE  Restricted   F  Sociable    G  Different    H  Random",
   "bacaan": "1\nThere was a time when we thought humans were special in so many ways. Now we know better. We are not the only species that feels emotions, empathises with others or abides by a moral code. Neither are we the only ones with personalities, cultures and the ability to design and use tools. Yet we have steadfastly clung to the notion that one attribute, at least, makes us unique: we alone have the capacity for language.\n\n2\nAlas, it turns out we are not so special in this respect either. Key to the revolutionary reassessment of our talent for communication is the way we think about language itself. Where once it was seen as a monolith, a discrete and singular entity, today scientists find it is more productive to think of language as a suite of abilities. Viewed this way, it becomes apparent that the component parts of language are not as unique as the whole.\n\n3\nTake gesture, arguably the starting point for language. Until recently, it was considered uniquely human – but not any more. Mike Tomasello of the Max Planck Institute for Evolutionary Anthropology in Leipzig, Germany, and others have compiled a list of gestures observed in monkeys, gibbons, gorillas, chimpanzees, bonobos and orang-utans, which reveals that gesticulation plays a large role in their communication. Ape gestures can involve touch, vocalising or eye movement, and individuals wait until they have another ape's attention before making visual or auditory gestures. If their gestures go unacknowledged, they will often repeat them or touch the recipient.\n\n4\nIn an experiment carried out in 2006 by Erica Cartmill and Richard Byrne from the University of St Andrews in the UK, they got a person to sit on a chair with some highly desirable food such as banana to one side of them and some bland food such as celery to the other. The orang-utans, who could see the person and the food from their enclosures, gestured at their human partners to encourage them to push the desirable food their way. If the person feigned incomprehension and offered the bland food, the animals would change their gestures – just as humans would in a similar situation. If the human seemed to understand while being somewhat confused, giving only half the preferred food, the apes would repeat and exaggerate their gestures again in exactly the same way a human would. Such findings highlight the fact that the gestures of non-human primates are not merely innate reflexes but are learned, flexible and under voluntary control – all characteristics that are considered prerequisites for human-like communication.\n\n5\nAs well as gesturing, pre-linguistic infants babble. At about five months, babies start to make their first speech sounds, which some researchers believe contain a random selection of all the phonemes humans can produce. But as children learn the language of their parents, they narrow their sound repertoire to fit the model to which they are exposed, producing just the sounds of their native language as well as its classic intonation patterns. Indeed, they lose their polymath talents so effectively that they are ultimately unable to produce some sounds – think about the difficulty some speakers have producing the English th.\n\n6\nDolphin calves also pass through a babbling phase. Laurance Doyle from the SETI Institute in Mountain View, California, Brenda McCowan from the University of California at Davis and their colleagues analysed the complexity of baby dolphin sounds and found it looked remarkably like that of babbling infants, in that the young dolphins had a much wider repertoire of sound than adults. This suggests that they practise the sounds of their species, much as human babies do, before they begin to put them together in the way characteristic of mature dolphins of their species.\n\n7\nOf course, language is more than mere sound – it also has meaning. While the traditional, cartoonish version of animal communication renders it unclear, unpredictable and involuntary, it has become clear that various species are able to give meaning to particular sounds by connecting them with specific ideas. Dolphins use 'signature whistles', so called because it appears that they name themselves. Each develops a unique moniker within the first year of life and uses it whenever it meets another dolphin.\n\n8\nOne of the clearest examples of animals making connections between specific sounds and meanings was demonstrated by Klaus Zuberbühler and Katie Slocombe of the University of St Andrews in the UK. They noticed that chimps at Edinburgh Zoo appeared to make rudimentary references to objects by using distinct cries when they came across different kinds of food. Highly valued foods such as bread would elicit high-pitched grunts, less appealing ones, such as an apple, got low-pitched grunts. Zuberbühler and Slocombe showed not only that chimps could make distinctions in the way they vocalised about food, but that other chimps understood what they meant. When played recordings of grunts that were produced for a specific food, the chimps looked in the place where that food was usually found. They also searched longer if the cry had signalled a prized type of food.\n\n9\nClearly animals do have greater talents for communication than we realised. Humans are still special, but it is a far more graded, qualified kind of special than it used to be.",
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "SPEAKING",
   "nomor": 1,
   "judul": "Part 1",
   "instruksi": null,
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "SPEAKING",
   "nomor": 2,
   "judul": "Part 2",
   "instruksi": null,
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "SPEAKING",
   "nomor": 3,
   "judul": "Part 3",
   "instruksi": null,
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "WRITING",
   "nomor": 1,
   "judul": "Task 1",
   "instruksi": null,
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  },
  {
   "subtes": "WRITING",
   "nomor": 2,
   "judul": "Task 2",
   "instruksi": null,
   "bacaan": null,
   "transkrip": null,
   "audioBerkas": null,
   "audioNama": null
  }
 ],
 "soal": [
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 1,
   "tipe": "IS",
   "pertanyaan": "CUSTOMER DETAILS\nCaller's name: Sue Brown (Example)\n\n1. Company name: ______________",
   "opsi": [],
   "kunci": "dress your best",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 2,
   "tipe": "IS",
   "pertanyaan": "2. Address: ______________ Trading Estate, 210 New Hampton Road, South Down",
   "opsi": [],
   "kunci": "kirby",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 3,
   "tipe": "IS",
   "pertanyaan": "3. Contact number: ______________ (mobile)",
   "opsi": [],
   "kunci": "09536 788 545|09536788545",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 4,
   "tipe": "IS",
   "pertanyaan": "4. Delivery option: ______________",
   "opsi": [],
   "kunci": "extra charge|charge",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 5,
   "tipe": "IS",
   "pertanyaan": "Method of payment: Credit card\n\n5. Type: ______________",
   "opsi": [],
   "kunci": "american express",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 6,
   "tipe": "IS",
   "pertanyaan": "ORDER — row 1\nITEM: Office Chair · CODE: ASP 23 · QUANTITY: 5\n\n6. COLOR: ______________",
   "opsi": [],
   "kunci": "black|dark",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 7,
   "tipe": "IS",
   "pertanyaan": "ORDER — row 2\nQUANTITY: 2\n\n7. ITEM: ______________",
   "opsi": [],
   "kunci": "glass desks|glass desk",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 8,
   "tipe": "IS",
   "pertanyaan": "ORDER — row 2 (the same item as question 7)\nQUANTITY: 2\n\n8. CODE: ______________",
   "opsi": [],
   "kunci": "tg 586|tg586",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 9,
   "tipe": "IS",
   "pertanyaan": "ORDER — row 3\nITEM: Leather sofa · CODE: DFD 44 · QUANTITY: 1\n\n9. COLOR: ______________",
   "opsi": [],
   "kunci": "yellow",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 1,
   "nomor": 10,
   "tipe": "IS",
   "pertanyaan": "ORDER — row 4\nCODE: TX 22 · COLOR: silver · QUANTITY: 1\n\n10. ITEM: ______________",
   "opsi": [],
   "kunci": "coffee table",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 11,
   "tipe": "IS",
   "pertanyaan": "MARATHON – TIPS FOR SPECTATORS\n\n11. To enjoy the day, make sure you ______________ it first.",
   "opsi": [],
   "kunci": "plan",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 12,
   "tipe": "IS",
   "pertanyaan": "12. Travel ______________ within the city centre.",
   "opsi": [],
   "kunci": "on foot",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 13,
   "tipe": "IS",
   "pertanyaan": "13. Wear ______________ on the day.",
   "opsi": [],
   "kunci": "sensible clothes",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 14,
   "tipe": "IS",
   "pertanyaan": "14. Check the ______________ the night before the marathon.",
   "opsi": [],
   "kunci": "weather forecast|forecast|weather",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 15,
   "tipe": "IS",
   "pertanyaan": "15. Let the ______________ give drinks to runners.",
   "opsi": [],
   "kunci": "volunteers",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 16,
   "tipe": "IS",
   "pertanyaan": "16. Stay on one side of the road to avoid ______________.",
   "opsi": [],
   "kunci": "accidents",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 17,
   "tipe": "IS",
   "pertanyaan": "17. Don't arrange to meet runners near the ______________.",
   "opsi": [],
   "kunci": "finish line",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 18,
   "tipe": "IS",
   "pertanyaan": "18. Taxis — write the correct letter, A–E.",
   "opsi": [],
   "kunci": "c",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 19,
   "tipe": "IS",
   "pertanyaan": "19. Trams — write the correct letter, A–E.",
   "opsi": [],
   "kunci": "b",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 2,
   "nomor": 20,
   "tipe": "IS",
   "pertanyaan": "20. Buses — write the correct letter, A–E.",
   "opsi": [],
   "kunci": "e",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 21,
   "tipe": "PG",
   "pertanyaan": "21. What does Ahmed say about last week's seminar?",
   "opsi": [
    "He wasn't able to get there on time.",
    "He didn't know all the students.",
    "He couldn't understand everything."
   ],
   "kunci": "C",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 22,
   "tipe": "PG",
   "pertanyaan": "22. What does the tutor say about Ahmed's preparation for the seminar?",
   "opsi": [
    "He was better prepared than some students.",
    "He completed some useful work.",
    "He read some useful articles."
   ],
   "kunci": "B",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 23,
   "tipe": "PG",
   "pertanyaan": "23. What does Ahmed say about his participation in the seminar?",
   "opsi": [
    "He tended to speak to his neighbour only.",
    "He spoke when other students were talking.",
    "He felt embarrassed when students looked at him."
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 24,
   "tipe": "PG",
   "pertanyaan": "24. What does Ahmed worry about most in seminars?",
   "opsi": [
    "Speaking at the right time",
    "Taking enough notes",
    "Staying focused"
   ],
   "kunci": "C",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 25,
   "tipe": "PG",
   "pertanyaan": "25. What does Ahmed say about his role in the group?",
   "opsi": [
    "He hasn't thought about it.",
    "He'd like to change it.",
    "He feels he is acting a part."
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 26,
   "tipe": "PG",
   "pertanyaan": "26. At the next seminar, Ahmed's tutor suggests that he should:",
   "opsi": [
    "Give other students more help with their work.",
    "Observe the behaviour of other students.",
    "Ask other students for their views."
   ],
   "kunci": "B",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 27,
   "tipe": "IS",
   "pertanyaan": "27. Strategies for the next seminar — FIRST letter (alphabetical order).",
   "opsi": [],
   "kunci": "d",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 28,
   "tipe": "IS",
   "pertanyaan": "28. Strategies for the next seminar — SECOND letter (alphabetical order).",
   "opsi": [],
   "kunci": "e",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 29,
   "tipe": "IS",
   "pertanyaan": "29. Suggestions about taking notes — FIRST letter (alphabetical order).",
   "opsi": [],
   "kunci": "a",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 3,
   "nomor": 30,
   "tipe": "IS",
   "pertanyaan": "30. Suggestions about taking notes — SECOND letter (alphabetical order).",
   "opsi": [],
   "kunci": "c",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 31,
   "tipe": "IS",
   "pertanyaan": "DESERT PLANTS — Background\n\n31. Deserts are found in what is known as a ______________ (or dry area).",
   "opsi": [],
   "kunci": "rain shadow",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 32,
   "tipe": "IS",
   "pertanyaan": "32. Annual rainfall, if any, amounts to a ______________.",
   "opsi": [],
   "kunci": "few inches",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 33,
   "tipe": "IS",
   "pertanyaan": "33. Soil contains a lot of salt and ______________.",
   "opsi": [],
   "kunci": "other minerals|minerals",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 34,
   "tipe": "IS",
   "pertanyaan": "General Adaptations of Desert Plants\n\n34. They can ______________ and store water.\n(They also have features that reduce water loss.)",
   "opsi": [],
   "kunci": "collect",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 35,
   "tipe": "IS",
   "pertanyaan": "Examples of Adaptations\n\n35. Saguaro Cactus: Stores water in its ______________.",
   "opsi": [],
   "kunci": "green stem|stem",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 36,
   "tipe": "IS",
   "pertanyaan": "36. Barrel Cactus: Can ______________ or shrink according to weather.",
   "opsi": [],
   "kunci": "expand",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 37,
   "tipe": "IS",
   "pertanyaan": "37. Old Man Cactus: Has ______________ that reflect the sun.",
   "opsi": [],
   "kunci": "white hairs",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 38,
   "tipe": "IS",
   "pertanyaan": "38. Prickly Pear Cactus: Has ______________ to keep away animals.",
   "opsi": [],
   "kunci": "sharp thorns|thorns",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 39,
   "tipe": "IS",
   "pertanyaan": "39. Desert Spoon: Leaves are ______________ to reduce water loss.",
   "opsi": [],
   "kunci": "very tough|tough",
   "catatan": null
  },
  {
   "subtes": "LISTENING",
   "seksiNomor": 4,
   "nomor": 40,
   "tipe": "IS",
   "pertanyaan": "40. Aloe Plant: Leaf surface acts like a ______________ covering and keeps water inside.",
   "opsi": [],
   "kunci": "plastic",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 41,
   "tipe": "TFNG",
   "pertanyaan": "41. Improvements have been made to Roomba over time.",
   "opsi": [],
   "kunci": "TRUE",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 42,
   "tipe": "TFNG",
   "pertanyaan": "42. Obstacles have to be removed from Roomba's path.",
   "opsi": [],
   "kunci": "FALSE",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 43,
   "tipe": "TFNG",
   "pertanyaan": "43. Roomba keeps cleaning in one place until it thinks it is dirt free.",
   "opsi": [],
   "kunci": "TRUE",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 44,
   "tipe": "TFNG",
   "pertanyaan": "44. People once found washing machines as fascinating as robots.",
   "opsi": [],
   "kunci": "TRUE",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 45,
   "tipe": "TFNG",
   "pertanyaan": "45. Comparative studies are available on the intelligence of domestic robots.",
   "opsi": [],
   "kunci": "NOT GIVEN",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 46,
   "tipe": "TFNG",
   "pertanyaan": "46. Roomba tidies up a room as well as cleaning it.",
   "opsi": [],
   "kunci": "FALSE",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 47,
   "tipe": "IS",
   "pertanyaan": "47. What is used to mark out the mowing area for the Automower?",
   "opsi": [],
   "kunci": "wire",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 48,
   "tipe": "IS",
   "pertanyaan": "48. What form of renewable energy can some Automowers use?",
   "opsi": [],
   "kunci": "solar power",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 49,
   "tipe": "IS",
   "pertanyaan": "49. What does the ironing robot look like?",
   "opsi": [],
   "kunci": "an inflatable dummy|inflatable dummy",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 50,
   "tipe": "IS",
   "pertanyaan": "50. What do people often put on a robot when it is going to be repaired?",
   "opsi": [],
   "kunci": "a mark",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 51,
   "tipe": "IS",
   "pertanyaan": "THE ROVIO — label 1\n\n51. ______________ holding webcam",
   "opsi": [],
   "kunci": "an extending arm|extending arm",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 52,
   "tipe": "IS",
   "pertanyaan": "THE ROVIO — label 2\n\n52. Wheel design allows easy ______________",
   "opsi": [],
   "kunci": "movement",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 1,
   "nomor": 53,
   "tipe": "IS",
   "pertanyaan": "THE ROVIO — label 3\n\n53. Manual controls give home-owner ______________ with robot",
   "opsi": [],
   "kunci": "two-way communication|twoway communication|two way communication",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 54,
   "tipe": "IS",
   "pertanyaan": "54. two ways that farming activity might be improved in the future",
   "opsi": [],
   "kunci": "d",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 55,
   "tipe": "IS",
   "pertanyaan": "55. reference to a fall in the rate of deforestation in one area",
   "opsi": [],
   "kunci": "e",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 56,
   "tipe": "IS",
   "pertanyaan": "56. the amount of forest cut down annually",
   "opsi": [],
   "kunci": "a",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 57,
   "tipe": "IS",
   "pertanyaan": "57. how future transport requirements may increase deforestation levels",
   "opsi": [],
   "kunci": "f",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 58,
   "tipe": "IS",
   "pertanyaan": "58. a reference to the typical shape of early deforested areas",
   "opsi": [],
   "kunci": "a",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 59,
   "tipe": "IS",
   "pertanyaan": "59. key reasons why forests in some areas have not been cut down",
   "opsi": [],
   "kunci": "g",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 60,
   "tipe": "IS",
   "pertanyaan": "60. Reasons for current patterns of deforestation — FIRST letter (alphabetical order).",
   "opsi": [],
   "kunci": "c",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 61,
   "tipe": "IS",
   "pertanyaan": "61. Reasons for current patterns of deforestation — SECOND letter (alphabetical order).",
   "opsi": [],
   "kunci": "d",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 62,
   "tipe": "IS",
   "pertanyaan": "62. Impacts mentioned by the writer — FIRST letter (alphabetical order).",
   "opsi": [],
   "kunci": "b",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 63,
   "tipe": "IS",
   "pertanyaan": "63. Impacts mentioned by the writer — SECOND letter (alphabetical order).",
   "opsi": [],
   "kunci": "c",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 64,
   "tipe": "IS",
   "pertanyaan": "64. The expression 'a ______________' is used to assess the amount of wood used in certain types of production.",
   "opsi": [],
   "kunci": "forest footprint",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 65,
   "tipe": "IS",
   "pertanyaan": "65. Greenhouse gases result from the ______________ that remain after trees have been cut down.",
   "opsi": [],
   "kunci": "decaying plants",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 2,
   "nomor": 66,
   "tipe": "IS",
   "pertanyaan": "66. About ______________ of the world's tropical forests have not experienced deforestation yet.",
   "opsi": [],
   "kunci": "60%|60 per cent|60 percent",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 67,
   "tipe": "PG",
   "pertanyaan": "67. What point does the writer make in the first paragraph?",
   "opsi": [
    "We know more about language now than we used to.",
    "We recognise the importance of talking about emotions.",
    "We like to believe that language is a strictly human skill.",
    "We have used tools for longer than some other species."
   ],
   "kunci": "C",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 68,
   "tipe": "PG",
   "pertanyaan": "68. According to the writer, what has changed our view of communication?",
   "opsi": [
    "analysing different world languages",
    "understanding that language involves a range of skills",
    "studying the different purposes of language",
    "realising that we can communicate without language"
   ],
   "kunci": "B",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 69,
   "tipe": "PG",
   "pertanyaan": "69. The writer quotes the Cartmill and Byrne experiment because it shows",
   "opsi": [
    "the similarities in the way humans and apes use gesture.",
    "the abilities of apes to use gesture in different environments.",
    "how food can be used to encourage ape gestures.",
    "how hard humans find it to interpret ape gestures."
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 70,
   "tipe": "PG",
   "pertanyaan": "70. In paragraph 7, the writer says that one type of dolphin sound is",
   "opsi": [
    "used only when dolphins are in danger.",
    "heard only at a particular time of day.",
    "heard at a range of pitch levels.",
    "used as a form of personal identification."
   ],
   "kunci": "D",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 71,
   "tipe": "PG",
   "pertanyaan": "71. Experiments at Edinburgh Zoo showed that chimps were able to",
   "opsi": [
    "use grunts to ask humans for food.",
    "use pitch changes to express meaning.",
    "recognise human voices on a recording.",
    "tell the difference between a false grunt and a real one."
   ],
   "kunci": "B",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 72,
   "tipe": "PG",
   "pertanyaan": "72. It could be said that language begins with gesture.",
   "opsi": [
    "YES",
    "NO",
    "NOT GIVEN"
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 73,
   "tipe": "PG",
   "pertanyaan": "73. Ape gestures always consist of head or limb movements.",
   "opsi": [
    "YES",
    "NO",
    "NOT GIVEN"
   ],
   "kunci": "B",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 74,
   "tipe": "PG",
   "pertanyaan": "74. Apes ensure that other apes are aware of their gesturing.",
   "opsi": [
    "YES",
    "NO",
    "NOT GIVEN"
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 75,
   "tipe": "PG",
   "pertanyaan": "75. Primate and human gestures share some key features.",
   "opsi": [
    "YES",
    "NO",
    "NOT GIVEN"
   ],
   "kunci": "A",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 76,
   "tipe": "PG",
   "pertanyaan": "76. Cartoons present an amusing picture of animal communication.",
   "opsi": [
    "YES",
    "NO",
    "NOT GIVEN"
   ],
   "kunci": "C",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 77,
   "tipe": "IS",
   "pertanyaan": "77. Write the correct letter, A–H.",
   "opsi": [],
   "kunci": "d",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 78,
   "tipe": "IS",
   "pertanyaan": "78. Write the correct letter, A–H.",
   "opsi": [],
   "kunci": "g",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 79,
   "tipe": "IS",
   "pertanyaan": "79. Write the correct letter, A–H.",
   "opsi": [],
   "kunci": "c",
   "catatan": null
  },
  {
   "subtes": "READING",
   "seksiNomor": 3,
   "nomor": 80,
   "tipe": "IS",
   "pertanyaan": "80. Write the correct letter, A–H.",
   "opsi": [],
   "kunci": "a",
   "catatan": null
  }
 ]
};

export default paket;
