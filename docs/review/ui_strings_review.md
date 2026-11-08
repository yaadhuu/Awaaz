# Web interface strings for review

Generated from `web/src/locales/*.ts` (machine-written). Malayalam: for Yadhu to review. Hindi: for a native speaker to spot-check. Mark problems in the last column; fixes go into the locale files.

## Malayalam (reviewer: Yadhu)

| Key | English | Malayalam | OK? / fix |
|---|---|---|---|
| `brand` | TinyTalk | TinyTalk | |
| `nav.home` | Home | ആരംഭം | |
| `nav.studio` | Studio | സ്റ്റുഡിയോ | |
| `nav.link` | Link lab | ലിങ്ക് പരീക്ഷണശാല | |
| `nav.teachback` | Teach-back | തിരിച്ചു പറയൽ | |
| `nav.results` | Results | ഫലങ്ങൾ | |
| `nav.playground` | Playground | പ്ലേഗ്രൗണ്ട് | |
| `nav.usage` | Usage | ഉപയോഗം | |
| `nav.library` | Library | ശേഖരം | |
| `nav.about` | About | വിവരം | |
| `nav.menu` | Menu | മെനു | |
| `lang` | Language | ഭാഷ | |
| `skip` | Skip to content | ഉള്ളടക്കത്തിലേക്ക് പോകുക | |
| `meter.title` | Credits | ക്രെഡിറ്റ് | |
| `meter.calls` | {{used}} of {{cap}} calls | {{cap}} കോളുകളിൽ {{used}} | |
| `meter.credits` | {{used}} of {{cap}} credits | {{cap}} ക്രെഡിറ്റിൽ {{used}} | |
| `meter.remaining` | about {{n}} left | ഏകദേശം {{n}} ബാക്കി | |
| `meter.noRate` | rate not configured | നിരക്ക് നിശ്ചയിച്ചിട്ടില്ല | |
| `meter.snapshot` | snapshot | സ്നാപ്ഷോട്ട് | |
| `meter.live` | live | തത്സമയം | |
| `meter.warn50` | Half of the cap is used. | പരിധിയുടെ പകുതി ഉപയോഗിച്ചു. | |
| `meter.warn80` | Four fifths of the cap is used. | പരിധിയുടെ അഞ്ചിൽ നാല് ഉപയോഗിച്ചു. | |
| `meter.warn95` | Almost at the cap. | പരിധി ഏകദേശം തീർന്നു. | |
| `meter.stop` | Cap reached. The server refuses live calls. | പരിധി എത്തി. സെർവർ തത്സമയ കോളുകൾ നിരസിക്കുന്നു. | |
| `mode.replay` | Replay edition: everything here comes from saved runs. Live calls are off. | റീപ്ലേ പതിപ്പ്: ഇവിടെയുള്ളതെല്ലാം സൂക്ഷിച്ച റണ്ണുകളിൽ നിന്നാണ്. തത്സമയ കോളുകൾ ഓഫാണ്. | |
| `mode.live` | Live edition: calls go to Gnani through our server and cost credits. | തത്സമയ പതിപ്പ്: കോളുകൾ ഞങ്ങളുടെ സെർവർ വഴി Gnani-യിലേക്ക് പോകുന്നു, ക്രെഡിറ്റ് ചെലവാകും. | |
| `common.loading` | Loading… | ലോഡ് ചെയ്യുന്നു… | |
| `common.error` | This could not be loaded. | ഇത് ലോഡ് ചെയ്യാനായില്ല. | |
| `common.offline` | You are offline, and this page needs data that is not saved in the browser. | നിങ്ങൾ ഓഫ്‌ലൈനാണ്, ഈ പേജിന് ബ്രൗസറിൽ സൂക്ഷിക്കാത്ത ഡാറ്റ വേണം. | |
| `common.retry` | Try again | വീണ്ടും ശ്രമിക്കുക | |
| `common.empty` | Nothing here yet. | ഇവിടെ ഇതുവരെ ഒന്നുമില്ല. | |
| `common.source` | Source | ഉറവിടം | |
| `common.download` | Download | ഡൗൺലോഡ് | |
| `common.play` | Play | പ്ലേ | |
| `common.stop` | Stop | നിർത്തുക | |
| `common.replayOnly` | Available in the live edition only. | ഇത് തത്സമയ പതിപ്പിൽ മാത്രം. | |
| `common.liveNeeded` | This needs the live edition (LIVE=1 and an access code). | ഇതിന് തത്സമയ പതിപ്പ് വേണം (LIVE=1, ആക്സസ് കോഡ്). | |
| `common.accessCode` | Access code | ആക്സസ് കോഡ് | |
| `common.confirm` | This call costs about {{amount}} {{unit}}. Go ahead? | ഈ കോളിന് ഏകദേശം {{amount}} {{unit}} ചെലവാകും. തുടരണോ? | |
| `common.confirmBtn` | Spend and continue | ചെലവാക്കി തുടരുക | |
| `common.cancel` | Cancel | റദ്ദാക്കുക | |
| `common.estimate` | Estimate | ഏകദേശം | |
| `common.actual` | Actual | യഥാർത്ഥം | |
| `common.seconds` | seconds of audio | സെക്കൻഡ് ഓഡിയോ | |
| `common.characters` | characters | അക്ഷരങ്ങൾ | |
| `common.credits` | credits | ക്രെഡിറ്റ് | |
| `common.calls` | calls | കോളുകൾ | |
| `tier.A.name` | Audio | ഓഡിയോ | |
| `tier.A.desc` | The voice itself, squeezed to 2400 bits a second. | ശബ്ദം തന്നെ, സെക്കൻഡിൽ 2400 ബിറ്റായി ചുരുക്കിയത്. | |
| `tier.B.name` | Transcript | എഴുത്ത് | |
| `tier.B.desc` | The words, packed into a few dozen bytes. | വാക്കുകൾ, കുറച്ച് ഡസൻ ബൈറ്റുകളിൽ. | |
| `tier.C.name` | Key facts | പ്രധാന വസ്തുതകൾ | |
| `tier.C.desc` | Only the places, numbers and times. | സ്ഥലങ്ങൾ, സംഖ്യകൾ, സമയങ്ങൾ മാത്രം. | |
| `why.A` | The link is clean and fast enough to carry the voice as it is spoken. | ലിങ്ക് വൃത്തിയുള്ളതാണ്, സംസാരിക്കുന്നതിനൊപ്പം ശബ്ദം കൊണ്ടുപോകാൻ വേഗവുമുണ്ട്. | |
| `why.Bloss` | Too many packets are lost for audio. The transcript goes instead. | ഓഡിയോയ്ക്ക് വളരെയധികം പാക്കറ്റുകൾ നഷ്ടപ്പെടുന്നു. അതിനാൽ എഴുത്ത് പോകുന്നു. | |
| `why.Brate` | The link is too slow for live audio. The transcript goes instead. | തത്സമയ ഓഡിയോയ്ക്ക് ലിങ്ക് വളരെ പതുക്കെയാണ്. അതിനാൽ എഴുത്ത് പോകുന്നു. | |
| `why.C` | The link is too weak even for text. Only the key facts go. | എഴുത്തിനുപോലും ലിങ്ക് ദുർബലമാണ്. പ്രധാന വസ്തുതകൾ മാത്രം പോകുന്നു. | |
| `facts.missing` | missing | ഇല്ല | |
| `facts.wrong` | wrong | തെറ്റ് | |
| `facts.heard` | heard | കേട്ടത് | |
| `packets_one` | {{count}} packet · {{lost}} lost · {{resent}} resent | {{count}} പാക്കറ്റ് · {{lost}} നഷ്ടം · {{resent}} വീണ്ടും അയച്ചു | |
| `packets_other` | {{count}} packets · {{lost}} lost · {{resent}} resent | {{count}} പാക്കറ്റുകൾ · {{lost}} നഷ്ടം · {{resent}} വീണ്ടും അയച്ചു | |
| `dial.label` | Link speed | ലിങ്ക് വേഗത | |
| `dial.loss` | Packet loss | പാക്കറ്റ് നഷ്ടം | |
| `home.kicker` | A field manual for weak links | ദുർബലമായ ലിങ്കുകൾക്കുള്ള ഒരു ഫീൽഡ് മാന്വൽ | |
| `home.title` | When the line is bad, send what matters. | ലൈൻ മോശമാകുമ്പോൾ, പ്രധാനമായത് അയയ്ക്കുക. | |
| `home.lede` | In a flood, a voice message over a failing link arrives broken or not at all. TinyTalk measures the link and sends one of three things: the audio, the transcript, or only the facts. Then the receiver reads the facts back, and a wrong number is caught. | വെള്ളപ്പൊക്കത്തിൽ, തകരുന്ന ലിങ്കിലൂടെ അയയ്ക്കുന്ന ശബ്ദസന്ദേശം മുറിഞ്ഞോ ഒട്ടും തന്നെയോ എത്തില്ല. TinyTalk ലിങ്ക് അളന്ന് മൂന്നിലൊന്ന് അയയ്ക്കുന്നു: ഓഡിയോ, എഴുത്ത്, അല്ലെങ്കിൽ വസ്തുതകൾ മാത്രം. പിന്നെ സ്വീകർത്താവ് വസ്തുതകൾ തിരിച്ചു പറയുന്നു, തെറ്റായ സംഖ്യ പിടിക്കപ്പെടുന്നു. | |
| `home.problemTitle` | The problem, in three languages | പ്രശ്നം, മൂന്ന് ഭാഷകളിൽ | |
| `home.tryIt` | Turn the dial | ഡയൽ തിരിക്കുക | |
| `home.tiersTitle` | Three ways to send one message | ഒരു സന്ദേശം അയയ്ക്കാൻ മൂന്ന് വഴികൾ | |
| `home.resultTitle` | What we measured | ഞങ്ങൾ അളന്നത് | |
| `home.resultLine` | On a clean link the voice carries {{a}} of the facts. At 30% packet loss it carries {{a30}}, while the facts alone still carry {{c30}}, using {{ratio}} times fewer bytes. | വൃത്തിയുള്ള ലിങ്കിൽ ശബ്ദം {{a}} വസ്തുതകൾ എത്തിക്കുന്നു. 30% പാക്കറ്റ് നഷ്ടത്തിൽ അത് {{a30}} ആകുന്നു, വസ്തുതകൾ മാത്രം അയച്ചാൽ {{c30}} എത്തുന്നു, {{ratio}} മടങ്ങ് കുറവ് ബൈറ്റുകളിൽ. | |
| `home.resultNote` | English test messages, synthetic speech, simulated link. Bars show 95% intervals. | ഇംഗ്ലീഷ് പരീക്ഷണ സന്ദേശങ്ങൾ, കൃത്രിമ ശബ്ദം, അനുകരിച്ച ലിങ്ക്. വരകൾ 95% ഇടവേള കാണിക്കുന്നു. | |
| `home.open` | Open the results | ഫലങ്ങൾ തുറക്കുക | |
| `home.studio` | Send a message in the studio | സ്റ്റുഡിയോയിൽ ഒരു സന്ദേശം അയയ്ക്കുക | |
| `studio.title` | Studio | സ്റ്റുഡിയോ | |
| `studio.lede` | Follow one message from the sender’s mouth to the receiver’s ear. | ഒരു സന്ദേശം അയയ്ക്കുന്നയാളുടെ വായിൽ നിന്ന് സ്വീകർത്താവിന്റെ ചെവി വരെ പിന്തുടരുക. | |
| `studio.pick` | Message | സന്ദേശം | |
| `studio.record` | Record | റെക്കോർഡ് ചെയ്യുക | |
| `studio.recordHint` | Up to 30 seconds. Silence at both ends is trimmed. | 30 സെക്കൻഡ് വരെ. രണ്ടറ്റത്തെയും നിശ്ശബ്ദത മുറിച്ചുമാറ്റും. | |
| `studio.recording` | Recording… speak now | റെക്കോർഡ് ചെയ്യുന്നു… ഇപ്പോൾ സംസാരിക്കുക | |
| `studio.stopRec` | Stop | നിർത്തുക | |
| `studio.typeOwn` | Or type a message | അല്ലെങ്കിൽ ഒരു സന്ദേശം എഴുതുക | |
| `studio.steps.record` | Record | റെക്കോർഡ് | |
| `studio.steps.transcribe` | Transcribe | എഴുത്താക്കുക | |
| `studio.steps.facts` | Find facts | വസ്തുതകൾ | |
| `studio.steps.pick` | Pick tier | തലം | |
| `studio.steps.pack` | Pack | പാക്ക് | |
| `studio.steps.send` | Send | അയയ്ക്കുക | |
| `studio.steps.receive` | Receive | സ്വീകരിക്കുക | |
| `studio.steps.speak` | Speak | പറയുക | |
| `studio.heard` | What Prisma heard | Prisma കേട്ടത് | |
| `studio.factsFound` | Facts found | കണ്ടെത്തിയ വസ്തുതകൾ | |
| `studio.bytes` | bytes | ബൈറ്റ് | |
| `studio.airtime` | Airtime | സംപ്രേഷണ സമയം | |
| `studio.receivedA` | The receiver hears the voice after the link. | സ്വീകർത്താവ് ലിങ്കിന് ശേഷമുള്ള ശബ്ദം കേൾക്കുന്നു. | |
| `studio.receivedB` | The receiver reads the transcript. | സ്വീകർത്താവ് എഴുത്ത് വായിക്കുന്നു. | |
| `studio.receivedC` | The receiver gets the facts and Timbre speaks them. | സ്വീകർത്താവിന് വസ്തുതകൾ കിട്ടുന്നു, Timbre അവ പറയുന്നു. | |
| `studio.speakReplay` | In the live edition, Timbre speaks these facts in the message’s language. | തത്സമയ പതിപ്പിൽ Timbre ഈ വസ്തുതകൾ സന്ദേശത്തിന്റെ ഭാഷയിൽ പറയും. | |
| `studio.speak` | Speak the facts | വസ്തുതകൾ പറയുക | |
| `studio.measured` | In the measured run this message kept {{m}} of {{t}} facts at this loss. | അളന്ന റണ്ണിൽ ഈ നഷ്ടത്തിൽ ഈ സന്ദേശത്തിന്റെ {{t}} വസ്തുതകളിൽ {{m}} എണ്ണം നിലനിന്നു. | |
| `studio.before` | Before the link | ലിങ്കിന് മുമ്പ് | |
| `studio.after` | After the link | ലിങ്കിന് ശേഷം | |
| `link.title` | Link lab | ലിങ്ക് പരീക്ഷണശാല | |
| `link.lede` | A software model of a bad radio link: a fixed speed, and packets lost in bursts. Change it and listen. | മോശം റേഡിയോ ലിങ്കിന്റെ ഒരു സോഫ്റ്റ്‌വെയർ മാതൃക: നിശ്ചിത വേഗത, കൂട്ടമായി നഷ്ടപ്പെടുന്ന പാക്കറ്റുകൾ. മാറ്റി കേട്ടുനോക്കുക. | |
| `link.airtime` | Airtime for this message | ഈ സന്ദേശത്തിന്റെ സംപ്രേഷണ സമയം | |
| `link.perTier` | Seconds on the air, by tier | ഓരോ തലത്തിനും സംപ്രേഷണ സെക്കൻഡുകൾ | |
| `link.ab` | Listen: before and after the link | കേൾക്കുക: ലിങ്കിന് മുമ്പും ശേഷവും | |
| `link.original` | Original | മൂലം | |
| `link.after` | After the link (Tier A) | ലിങ്കിന് ശേഷം (തലം A) | |
| `link.bed` | Radio noise bed | റേഡിയോ ശബ്ദശല്യം | |
| `link.noBed` | No noise | ശല്യമില്ല | |
| `link.snr` | Signal to noise | സിഗ്നൽ-ശല്യ അനുപാതം | |
| `link.snrHint` | Lower is noisier. Mixed in your browser; nothing is sent. | കുറഞ്ഞാൽ കൂടുതൽ ശല്യം. നിങ്ങളുടെ ബ്രൗസറിൽ കലർത്തുന്നു; ഒന്നും അയയ്ക്കുന്നില്ല. | |
| `link.model` | Loss comes in bursts (Gilbert–Elliott model, average burst of 3 packets). Text tiers resend lost packets up to 3 times; audio does not. | നഷ്ടം കൂട്ടമായാണ് (Gilbert–Elliott മാതൃക, ശരാശരി 3 പാക്കറ്റ്). എഴുത്ത് തലങ്ങൾ നഷ്ടപ്പെട്ട പാക്കറ്റുകൾ 3 തവണ വരെ വീണ്ടും അയയ്ക്കുന്നു; ഓഡിയോ അയയ്ക്കില്ല. | |
| `teach.title` | Teach-back | തിരിച്ചു പറയൽ | |
| `teach.lede` | The receiver says the facts back. If a number, a place or a unit comes back different, the sender sees it at once. | സ്വീകർത്താവ് വസ്തുതകൾ തിരിച്ചു പറയുന്നു. ഒരു സംഖ്യയോ സ്ഥലമോ അളവോ മാറി വന്നാൽ, അയച്ചയാൾ ഉടൻ കാണുന്നു. | |
| `teach.sent` | Sent | അയച്ചത് | |
| `teach.readback` | Read back | തിരിച്ചു പറഞ്ഞത് | |
| `teach.asHeard` | Read back as heard | കേട്ടതുപോലെ തിരിച്ചു പറയുക | |
| `teach.alter` | Change one fact | ഒരു വസ്തുത മാറ്റുക | |
| `teach.check` | Check | പരിശോധിക്കുക | |
| `teach.match` | Everything matches. | എല്ലാം ശരിയാണ്. | |
| `teach.caught` | Mismatch caught. | പിശക് കണ്ടെത്തി. | |
| `teach.missing` | Missing | വിട്ടുപോയത് | |
| `teach.wrong` | Heard instead | പകരം കേട്ടത് | |
| `teach.ratesTitle` | How well the check works | പരിശോധന എത്ര നന്നായി പ്രവർത്തിക്കുന്നു | |
| `teach.ratesNote` | Measured on saved Prisma transcripts of the 28 test messages per language. Half had one fact changed on purpose. No new calls. | ഓരോ ഭാഷയിലെയും 28 പരീക്ഷണ സന്ദേശങ്ങളുടെ സൂക്ഷിച്ച Prisma എഴുത്തിൽ അളന്നത്. പകുതിയിൽ മനഃപൂർവം ഒരു വസ്തുത മാറ്റി. പുതിയ കോളുകൾ ഇല്ല. | |
| `teach.catch` | Catch rate | പിടികൂടൽ നിരക്ക് | |
| `teach.falseAlarm` | False alarms | തെറ്റായ മുന്നറിയിപ്പുകൾ | |
| `teach.condOff` | no hints | സൂചനയില്ലാതെ | |
| `teach.condBoth` | place-name hints | സ്ഥലനാമ സൂചനകളോടെ | |
| `results.title` | Results | ഫലങ്ങൾ | |
| `results.lede` | Every number here is copied from a saved results file. Follow the source link next to it. | ഇവിടത്തെ ഓരോ സംഖ്യയും സൂക്ഷിച്ച ഫല ഫയലിൽ നിന്ന് പകർത്തിയതാണ്. അടുത്തുള്ള ഉറവിട ലിങ്ക് നോക്കുക. | |
| `results.curve` | Facts correct against bytes per minute | ശരിയായ വസ്തുതകളും മിനിറ്റിലെ ബൈറ്റുകളും | |
| `results.curveX` | Bytes on the air per minute of speech (log scale) | ഒരു മിനിറ്റ് സംസാരത്തിന് സംപ്രേഷണം ചെയ്ത ബൈറ്റുകൾ (ലോഗ് സ്കെയിൽ) | |
| `results.curveY` | Facts correct | ശരിയായ വസ്തുതകൾ | |
| `results.byLang` | Clean audio, by language | വൃത്തിയുള്ള ഓഡിയോ, ഭാഷ തിരിച്ച് | |
| `results.byVoice` | By voice | ശബ്ദം തിരിച്ച് | |
| `results.voiceNote` | Only one voice (Vasudha, speed 1.0) was run, to save credits. | ക്രെഡിറ്റ് ലാഭിക്കാൻ ഒരു ശബ്ദം മാത്രം (Vasudha, വേഗത 1.0) ഓടിച്ചു. | |
| `results.estimator` | Reliability estimator | വിശ്വാസ്യത അളക്കുന്ന മാതൃക | |
| `results.estimatorNote` | Not built. The plan was a model that predicts when a transcript’s facts are wrong. It was cut for time; the teach-back check covers the same risk. | നിർമ്മിച്ചില്ല. എഴുത്തിലെ വസ്തുതകൾ എപ്പോൾ തെറ്റുമെന്ന് പ്രവചിക്കുന്ന മാതൃകയായിരുന്നു പദ്ധതി. സമയക്കുറവ് കാരണം ഒഴിവാക്കി; തിരിച്ചു പറയൽ പരിശോധന അതേ അപകടം കൈകാര്യം ചെയ്യുന്നു. | |
| `results.experiments` | Experiment log | പരീക്ഷണ രേഖ | |
| `results.limits` | Limits | പരിമിതികൾ | |
| `results.downloads` | Downloads | ഡൗൺലോഡുകൾ | |
| `results.lang` | Language | ഭാഷ | |
| `results.cond` | Hints | സൂചനകൾ | |
| `results.facts` | Facts correct | ശരിയായ വസ്തുതകൾ | |
| `results.exact` | Messages fully right | പൂർണ്ണമായി ശരിയായ സന്ദേശങ്ങൾ | |
| `results.wer` | Word error | വാക്ക് പിശക് | |
| `results.cer` | Letter error | അക്ഷര പിശക് | |
| `play.title` | Playground | പ്ലേഗ്രൗണ്ട് | |
| `play.lede` | Try Gnani’s speech models directly. Every call shows its estimate before and its cost after. | Gnani-യുടെ സംഭാഷണ മാതൃകകൾ നേരിട്ട് പരീക്ഷിക്കുക. ഓരോ കോളും മുമ്പ് ഏകദേശ ചെലവും ശേഷം യഥാർത്ഥ ചെലവും കാണിക്കുന്നു. | |
| `play.sttTab` | Speech to text (Prisma) | സംഭാഷണം എഴുത്തിലേക്ക് (Prisma) | |
| `play.ttsTab` | Text to speech (Timbre) | എഴുത്ത് സംഭാഷണത്തിലേക്ക് (Timbre) | |
| `play.upload` | Audio file | ഓഡിയോ ഫയൽ | |
| `play.languages` | Languages | ഭാഷകൾ | |
| `play.auto` | Detect the language (indic-auto) | ഭാഷ കണ്ടെത്തുക (indic-auto) | |
| `play.format` | Output format | ഔട്ട്പുട്ട് രൂപം | |
| `play.keyterms` | Key terms (comma separated) | പ്രധാന വാക്കുകൾ (കോമ ഇട്ട്) | |
| `play.topic` | Topic | വിഷയം | |
| `play.transcribe` | Transcribe | എഴുത്താക്കുക | |
| `play.transcript` | Transcript | എഴുത്ത് | |
| `play.detected` | Detected language | കണ്ടെത്തിയ ഭാഷ | |
| `play.processing` | Processing time | പ്രോസസ്സിങ് സമയം | |
| `play.latency` | End-to-end latency | ആകെ കാലതാമസം | |
| `play.request` | Request id | അഭ്യർത്ഥന ഐഡി | |
| `play.text` | Text | എഴുത്ത് | |
| `play.voice` | Voice | ശബ്ദം | |
| `play.speed` | Speed | വേഗത | |
| `play.sampleRate` | Sample rate | സാമ്പിൾ നിരക്ക് | |
| `play.container` | File type | ഫയൽ തരം | |
| `play.insert` | Insert | ചേർക്കുക | |
| `play.speakBtn` | Speak | പറയുക | |
| `play.queue` | {{n}} waiting in the queue | ക്യൂവിൽ {{n}} കാത്തിരിക്കുന്നു | |
| `play.queueEmpty` | Queue empty | ക്യൂ ഒഴിഞ്ഞു | |
| `play.saved` | Saved sample runs | സൂക്ഷിച്ച സാമ്പിൾ റണ്ണുകൾ | |
| `play.savedNote` | Real calls made earlier, replayed from the cache. | മുമ്പ് നടത്തിയ യഥാർത്ഥ കോളുകൾ, കാഷിൽ നിന്ന് വീണ്ടും. | |
| `usage.title` | Usage | ഉപയോഗം | |
| `usage.lede` | Every call to Gnani is written to the ledger. This page reads it. | Gnani-യിലേക്കുള്ള ഓരോ കോളും ലെഡ്ജറിൽ എഴുതുന്നു. ഈ പേജ് അത് വായിക്കുന്നു. | |
| `usage.remaining` | Remaining (estimate) | ബാക്കി (ഏകദേശം) | |
| `usage.calibrate` | Balance on the Gnani dashboard | Gnani ഡാഷ്ബോർഡിലെ ബാലൻസ് | |
| `usage.calibrateBtn` | Calibrate | ക്രമീകരിക്കുക | |
| `usage.byDay` | Calls by day | ദിവസം തിരിച്ച് കോളുകൾ | |
| `usage.byKind` | By kind | തരം തിരിച്ച് | |
| `usage.ledger` | Ledger | ലെഡ്ജർ | |
| `usage.time` | Time | സമയം | |
| `usage.kind` | Kind | തരം | |
| `usage.language` | Language | ഭാഷ | |
| `usage.size` | Size | വലുപ്പം | |
| `usage.creditsCol` | Credits | ക്രെഡിറ്റ് | |
| `usage.cache` | Cache | കാഷ് | |
| `usage.hit` | hit | കാഷ് | |
| `usage.miss` | live | തത്സമയം | |
| `usage.export` | Export CSV | CSV കയറ്റുമതി | |
| `usage.showing` | Showing {{n}} of {{total}} rows | {{total}} വരികളിൽ {{n}} | |
| `usage.more` | Show more | കൂടുതൽ കാണിക്കുക | |
| `usage.rateNote` | Gnani does not publish prices. Until the rates are set in config.yaml, spend is counted in calls, seconds and characters. | Gnani വിലകൾ പ്രസിദ്ധീകരിക്കുന്നില്ല. config.yaml-ൽ നിരക്കുകൾ നിശ്ചയിക്കുന്നതുവരെ ചെലവ് കോളുകൾ, സെക്കൻഡുകൾ, അക്ഷരങ്ങൾ എന്നിവയിൽ എണ്ണുന്നു. | |
| `library.title` | Library | ശേഖരം | |
| `library.lede` | Radio noise used in the link lab. Only public domain, CC0 and CC BY sounds, and no recorded voices. | ലിങ്ക് പരീക്ഷണശാലയിൽ ഉപയോഗിക്കുന്ന റേഡിയോ ശബ്ദശല്യം. പൊതുസഞ്ചയം, CC0, CC BY ശബ്ദങ്ങൾ മാത്രം, റെക്കോർഡ് ചെയ്ത മനുഷ്യശബ്ദം ഇല്ല. | |
| `library.by` | by | സൃഷ്ടിച്ചത് | |
| `library.licence` | Licence | ലൈസൻസ് | |
| `library.accessed` | Accessed | എടുത്തത് | |
| `library.fonts` | Typefaces | അക്ഷരരൂപങ്ങൾ | |
| `about.title` | About | വിവരം | |
| `about.method` | Method | രീതി | |
| `about.simulated` | What is simulated | എന്താണ് അനുകരിച്ചത് | |
| `about.cloud` | Cloud dependency | ക്ലൗഡ് ആശ്രയം | |
| `about.built` | How it was built | എങ്ങനെ നിർമ്മിച്ചു | |
| `about.team` | Team | സംഘം | |
| `about.licences` | Licences | ലൈസൻസുകൾ | |
| `notFound.title` | No such page | ഇങ്ങനെയൊരു പേജില്ല | |
| `notFound.body` | The page you asked for is not in this manual. | നിങ്ങൾ ചോദിച്ച പേജ് ഈ മാന്വലിൽ ഇല്ല. | |
| `notFound.home` | Back to the start | തുടക്കത്തിലേക്ക് മടങ്ങുക | |
| `footer.licence` | Code MIT. Results CC BY 4.0. Sounds and typefaces under their own licences (see Library). | കോഡ് MIT. ഫലങ്ങൾ CC BY 4.0. ശബ്ദങ്ങളും അക്ഷരരൂപങ്ങളും അവയുടെ ലൈസൻസിൽ (ശേഖരം കാണുക). | |
| `footer.simulated` | Simulated link, synthetic speech. Not a radio test. | അനുകരിച്ച ലിങ്ക്, കൃത്രിമ ശബ്ദം. റേഡിയോ പരീക്ഷണമല്ല. | |

## Hindi (reviewer: native speaker)

| Key | English | Hindi | OK? / fix |
|---|---|---|---|
| `brand` | TinyTalk | TinyTalk | |
| `nav.home` | Home | मुखपृष्ठ | |
| `nav.studio` | Studio | स्टूडियो | |
| `nav.link` | Link lab | लिंक प्रयोगशाला | |
| `nav.teachback` | Teach-back | दोहराकर जाँच | |
| `nav.results` | Results | नतीजे | |
| `nav.playground` | Playground | प्लेग्राउंड | |
| `nav.usage` | Usage | उपयोग | |
| `nav.library` | Library | संग्रह | |
| `nav.about` | About | परिचय | |
| `nav.menu` | Menu | मेनू | |
| `lang` | Language | भाषा | |
| `skip` | Skip to content | सीधे सामग्री पर जाएँ | |
| `meter.title` | Credits | क्रेडिट | |
| `meter.calls` | {{used}} of {{cap}} calls | {{cap}} में से {{used}} कॉल | |
| `meter.credits` | {{used}} of {{cap}} credits | {{cap}} में से {{used}} क्रेडिट | |
| `meter.remaining` | about {{n}} left | लगभग {{n}} बाकी | |
| `meter.noRate` | rate not configured | दर तय नहीं | |
| `meter.snapshot` | snapshot | स्नैपशॉट | |
| `meter.live` | live | लाइव | |
| `meter.warn50` | Half of the cap is used. | सीमा का आधा उपयोग हो चुका है। | |
| `meter.warn80` | Four fifths of the cap is used. | सीमा का चार-पाँचवाँ उपयोग हो चुका है। | |
| `meter.warn95` | Almost at the cap. | सीमा लगभग पूरी हो गई है। | |
| `meter.stop` | Cap reached. The server refuses live calls. | सीमा पूरी। सर्वर लाइव कॉल रोक रहा है। | |
| `mode.replay` | Replay edition: everything here comes from saved runs. Live calls are off. | रीप्ले संस्करण: यहाँ सब कुछ सहेजे गए रन से है। लाइव कॉल बंद हैं। | |
| `mode.live` | Live edition: calls go to Gnani through our server and cost credits. | लाइव संस्करण: कॉल हमारे सर्वर से Gnani तक जाती हैं और क्रेडिट लगते हैं। | |
| `common.loading` | Loading… | लोड हो रहा है… | |
| `common.error` | This could not be loaded. | यह लोड नहीं हो सका। | |
| `common.offline` | You are offline, and this page needs data that is not saved in the browser. | आप ऑफ़लाइन हैं, और इस पेज को वह डेटा चाहिए जो ब्राउज़र में सहेजा नहीं है। | |
| `common.retry` | Try again | फिर कोशिश करें | |
| `common.empty` | Nothing here yet. | अभी यहाँ कुछ नहीं है। | |
| `common.source` | Source | स्रोत | |
| `common.download` | Download | डाउनलोड | |
| `common.play` | Play | चलाएँ | |
| `common.stop` | Stop | रोकें | |
| `common.replayOnly` | Available in the live edition only. | यह सिर्फ़ लाइव संस्करण में उपलब्ध है। | |
| `common.liveNeeded` | This needs the live edition (LIVE=1 and an access code). | इसके लिए लाइव संस्करण चाहिए (LIVE=1 और एक्सेस कोड)। | |
| `common.accessCode` | Access code | एक्सेस कोड | |
| `common.confirm` | This call costs about {{amount}} {{unit}}. Go ahead? | इस कॉल में लगभग {{amount}} {{unit}} लगेंगे। आगे बढ़ें? | |
| `common.confirmBtn` | Spend and continue | खर्च करें और आगे बढ़ें | |
| `common.cancel` | Cancel | रद्द करें | |
| `common.estimate` | Estimate | अनुमान | |
| `common.actual` | Actual | वास्तविक | |
| `common.seconds` | seconds of audio | सेकंड ऑडियो | |
| `common.characters` | characters | अक्षर | |
| `common.credits` | credits | क्रेडिट | |
| `common.calls` | calls | कॉल | |
| `tier.A.name` | Audio | ऑडियो | |
| `tier.A.desc` | The voice itself, squeezed to 2400 bits a second. | असली आवाज़, 2400 बिट प्रति सेकंड में दबाई हुई। | |
| `tier.B.name` | Transcript | पाठ | |
| `tier.B.desc` | The words, packed into a few dozen bytes. | शब्द, कुछ दर्जन बाइट में समेटे हुए। | |
| `tier.C.name` | Key facts | मुख्य तथ्य | |
| `tier.C.desc` | Only the places, numbers and times. | सिर्फ़ स्थान, संख्याएँ और समय। | |
| `why.A` | The link is clean and fast enough to carry the voice as it is spoken. | लिंक साफ़ है और इतना तेज़ है कि आवाज़ बोलते-बोलते जा सके। | |
| `why.Bloss` | Too many packets are lost for audio. The transcript goes instead. | ऑडियो के लिए बहुत पैकेट खो रहे हैं। इसलिए पाठ जाता है। | |
| `why.Brate` | The link is too slow for live audio. The transcript goes instead. | लिंक सीधी आवाज़ के लिए बहुत धीमा है। इसलिए पाठ जाता है। | |
| `why.C` | The link is too weak even for text. Only the key facts go. | लिंक पाठ के लिए भी कमज़ोर है। सिर्फ़ मुख्य तथ्य जाते हैं। | |
| `facts.missing` | missing | छूटा | |
| `facts.wrong` | wrong | गलत | |
| `facts.heard` | heard | सुना | |
| `packets_one` | {{count}} packet · {{lost}} lost · {{resent}} resent | {{count}} पैकेट · {{lost}} खोए · {{resent}} दोबारा भेजे | |
| `packets_other` | {{count}} packets · {{lost}} lost · {{resent}} resent | {{count}} पैकेट · {{lost}} खोए · {{resent}} दोबारा भेजे | |
| `dial.label` | Link speed | लिंक की गति | |
| `dial.loss` | Packet loss | पैकेट हानि | |
| `home.kicker` | A field manual for weak links | कमज़ोर लिंक के लिए एक फ़ील्ड मैनुअल | |
| `home.title` | When the line is bad, send what matters. | जब लाइन खराब हो, ज़रूरी बात भेजें। | |
| `home.lede` | In a flood, a voice message over a failing link arrives broken or not at all. TinyTalk measures the link and sends one of three things: the audio, the transcript, or only the facts. Then the receiver reads the facts back, and a wrong number is caught. | बाढ़ में, टूटते लिंक पर भेजा गया वॉइस संदेश टूटा हुआ पहुँचता है या पहुँचता ही नहीं। TinyTalk लिंक को नापता है और तीन में से एक चीज़ भेजता है: ऑडियो, पाठ, या सिर्फ़ तथ्य। फिर पाने वाला तथ्य दोहराता है, और गलत संख्या पकड़ी जाती है। | |
| `home.problemTitle` | The problem, in three languages | समस्या, तीन भाषाओं में | |
| `home.tryIt` | Turn the dial | डायल घुमाएँ | |
| `home.tiersTitle` | Three ways to send one message | एक संदेश भेजने के तीन तरीके | |
| `home.resultTitle` | What we measured | हमने क्या नापा | |
| `home.resultLine` | On a clean link the voice carries {{a}} of the facts. At 30% packet loss it carries {{a30}}, while the facts alone still carry {{c30}}, using {{ratio}} times fewer bytes. | साफ़ लिंक पर आवाज़ {{a}} तथ्य पहुँचाती है। 30% पैकेट हानि पर वह {{a30}} पहुँचाती है, जबकि सिर्फ़ तथ्य {{c30}} पहुँचाते हैं, और {{ratio}} गुना कम बाइट लेते हैं। | |
| `home.resultNote` | English test messages, synthetic speech, simulated link. Bars show 95% intervals. | अंग्रेज़ी परीक्षण संदेश, सिंथेटिक आवाज़, सिम्युलेटेड लिंक। रेखाएँ 95% अंतराल दिखाती हैं। | |
| `home.open` | Open the results | नतीजे खोलें | |
| `home.studio` | Send a message in the studio | स्टूडियो में संदेश भेजें | |
| `studio.title` | Studio | स्टूडियो | |
| `studio.lede` | Follow one message from the sender’s mouth to the receiver’s ear. | एक संदेश को भेजने वाले के मुँह से पाने वाले के कान तक देखें। | |
| `studio.pick` | Message | संदेश | |
| `studio.record` | Record | रिकॉर्ड करें | |
| `studio.recordHint` | Up to 30 seconds. Silence at both ends is trimmed. | 30 सेकंड तक। दोनों सिरों की चुप्पी काट दी जाती है। | |
| `studio.recording` | Recording… speak now | रिकॉर्डिंग… अब बोलें | |
| `studio.stopRec` | Stop | रोकें | |
| `studio.typeOwn` | Or type a message | या संदेश लिखें | |
| `studio.steps.record` | Record | रिकॉर्ड | |
| `studio.steps.transcribe` | Transcribe | लिप्यंतरण | |
| `studio.steps.facts` | Find facts | तथ्य खोजें | |
| `studio.steps.pick` | Pick tier | स्तर चुनें | |
| `studio.steps.pack` | Pack | पैक करें | |
| `studio.steps.send` | Send | भेजें | |
| `studio.steps.receive` | Receive | पाएँ | |
| `studio.steps.speak` | Speak | बोलें | |
| `studio.heard` | What Prisma heard | Prisma ने क्या सुना | |
| `studio.factsFound` | Facts found | मिले तथ्य | |
| `studio.bytes` | bytes | बाइट | |
| `studio.airtime` | Airtime | प्रसारण समय | |
| `studio.receivedA` | The receiver hears the voice after the link. | पाने वाला लिंक के बाद की आवाज़ सुनता है। | |
| `studio.receivedB` | The receiver reads the transcript. | पाने वाला पाठ पढ़ता है। | |
| `studio.receivedC` | The receiver gets the facts and Timbre speaks them. | पाने वाले को तथ्य मिलते हैं और Timbre उन्हें बोलता है। | |
| `studio.speakReplay` | In the live edition, Timbre speaks these facts in the message’s language. | लाइव संस्करण में Timbre ये तथ्य संदेश की भाषा में बोलता है। | |
| `studio.speak` | Speak the facts | तथ्य बोलें | |
| `studio.measured` | In the measured run this message kept {{m}} of {{t}} facts at this loss. | नापे गए रन में इस हानि पर इस संदेश के {{t}} में से {{m}} तथ्य बचे। | |
| `studio.before` | Before the link | लिंक से पहले | |
| `studio.after` | After the link | लिंक के बाद | |
| `link.title` | Link lab | लिंक प्रयोगशाला | |
| `link.lede` | A software model of a bad radio link: a fixed speed, and packets lost in bursts. Change it and listen. | खराब रेडियो लिंक का सॉफ़्टवेयर मॉडल: तय गति, और झुंड में खोते पैकेट। बदलें और सुनें। | |
| `link.airtime` | Airtime for this message | इस संदेश का प्रसारण समय | |
| `link.perTier` | Seconds on the air, by tier | हर स्तर के लिए प्रसारण के सेकंड | |
| `link.ab` | Listen: before and after the link | सुनें: लिंक से पहले और बाद | |
| `link.original` | Original | मूल | |
| `link.after` | After the link (Tier A) | लिंक के बाद (स्तर A) | |
| `link.bed` | Radio noise bed | रेडियो शोर | |
| `link.noBed` | No noise | कोई शोर नहीं | |
| `link.snr` | Signal to noise | सिग्नल और शोर का अनुपात | |
| `link.snrHint` | Lower is noisier. Mixed in your browser; nothing is sent. | कम मान पर ज़्यादा शोर। आपके ब्राउज़र में मिलाया जाता है; कुछ भेजा नहीं जाता। | |
| `link.model` | Loss comes in bursts (Gilbert–Elliott model, average burst of 3 packets). Text tiers resend lost packets up to 3 times; audio does not. | हानि झुंड में होती है (Gilbert–Elliott मॉडल, औसत 3 पैकेट)। पाठ वाले स्तर खोए पैकेट 3 बार तक दोबारा भेजते हैं; ऑडियो नहीं। | |
| `teach.title` | Teach-back | दोहराकर जाँच | |
| `teach.lede` | The receiver says the facts back. If a number, a place or a unit comes back different, the sender sees it at once. | पाने वाला तथ्य दोहराता है। अगर कोई संख्या, स्थान या इकाई अलग लौटती है, तो भेजने वाला तुरंत देख लेता है। | |
| `teach.sent` | Sent | भेजा | |
| `teach.readback` | Read back | दोहराया | |
| `teach.asHeard` | Read back as heard | जैसा सुना वैसा दोहराएँ | |
| `teach.alter` | Change one fact | एक तथ्य बदलें | |
| `teach.check` | Check | जाँचें | |
| `teach.match` | Everything matches. | सब कुछ मेल खाता है। | |
| `teach.caught` | Mismatch caught. | गड़बड़ी पकड़ी गई। | |
| `teach.missing` | Missing | छूटा | |
| `teach.wrong` | Heard instead | इसके बजाय सुना | |
| `teach.ratesTitle` | How well the check works | जाँच कितनी अच्छी है | |
| `teach.ratesNote` | Measured on saved Prisma transcripts of the 28 test messages per language. Half had one fact changed on purpose. No new calls. | हर भाषा के 28 परीक्षण संदेशों के सहेजे गए Prisma पाठ पर नापा गया। आधे में जानबूझकर एक तथ्य बदला गया। कोई नई कॉल नहीं। | |
| `teach.catch` | Catch rate | पकड़ दर | |
| `teach.falseAlarm` | False alarms | गलत चेतावनी | |
| `teach.condOff` | no hints | बिना संकेत | |
| `teach.condBoth` | place-name hints | स्थान-नाम संकेत | |
| `results.title` | Results | नतीजे | |
| `results.lede` | Every number here is copied from a saved results file. Follow the source link next to it. | यहाँ की हर संख्या सहेजी गई नतीजा फ़ाइल से ली गई है। उसके पास का स्रोत लिंक देखें। | |
| `results.curve` | Facts correct against bytes per minute | सही तथ्य बनाम प्रति मिनट बाइट | |
| `results.curveX` | Bytes on the air per minute of speech (log scale) | प्रति मिनट आवाज़ पर प्रसारित बाइट (लॉग पैमाना) | |
| `results.curveY` | Facts correct | सही तथ्य | |
| `results.byLang` | Clean audio, by language | साफ़ ऑडियो, भाषा के हिसाब से | |
| `results.byVoice` | By voice | आवाज़ के हिसाब से | |
| `results.voiceNote` | Only one voice (Vasudha, speed 1.0) was run, to save credits. | क्रेडिट बचाने के लिए सिर्फ़ एक आवाज़ (Vasudha, गति 1.0) चलाई गई। | |
| `results.estimator` | Reliability estimator | विश्वसनीयता अनुमानक | |
| `results.estimatorNote` | Not built. The plan was a model that predicts when a transcript’s facts are wrong. It was cut for time; the teach-back check covers the same risk. | नहीं बनाया गया। योजना एक मॉडल की थी जो बताए कि पाठ के तथ्य कब गलत हैं। समय के कारण छोड़ा गया; दोहराकर जाँच वही जोखिम संभालती है। | |
| `results.experiments` | Experiment log | प्रयोग लॉग | |
| `results.limits` | Limits | सीमाएँ | |
| `results.downloads` | Downloads | डाउनलोड | |
| `results.lang` | Language | भाषा | |
| `results.cond` | Hints | संकेत | |
| `results.facts` | Facts correct | सही तथ्य | |
| `results.exact` | Messages fully right | पूरे सही संदेश | |
| `results.wer` | Word error | शब्द त्रुटि | |
| `results.cer` | Letter error | अक्षर त्रुटि | |
| `play.title` | Playground | प्लेग्राउंड | |
| `play.lede` | Try Gnani’s speech models directly. Every call shows its estimate before and its cost after. | Gnani के वाक् मॉडल सीधे आज़माएँ। हर कॉल पहले अनुमान और बाद में खर्च दिखाती है। | |
| `play.sttTab` | Speech to text (Prisma) | वाक् से पाठ (Prisma) | |
| `play.ttsTab` | Text to speech (Timbre) | पाठ से वाक् (Timbre) | |
| `play.upload` | Audio file | ऑडियो फ़ाइल | |
| `play.languages` | Languages | भाषाएँ | |
| `play.auto` | Detect the language (indic-auto) | भाषा पहचानें (indic-auto) | |
| `play.format` | Output format | आउटपुट प्रारूप | |
| `play.keyterms` | Key terms (comma separated) | मुख्य शब्द (अल्पविराम से अलग) | |
| `play.topic` | Topic | विषय | |
| `play.transcribe` | Transcribe | लिप्यंतरण करें | |
| `play.transcript` | Transcript | पाठ | |
| `play.detected` | Detected language | पहचानी गई भाषा | |
| `play.processing` | Processing time | प्रोसेसिंग समय | |
| `play.latency` | End-to-end latency | कुल विलंब | |
| `play.request` | Request id | अनुरोध आईडी | |
| `play.text` | Text | पाठ | |
| `play.voice` | Voice | आवाज़ | |
| `play.speed` | Speed | गति | |
| `play.sampleRate` | Sample rate | सैंपल दर | |
| `play.container` | File type | फ़ाइल प्रकार | |
| `play.insert` | Insert | जोड़ें | |
| `play.speakBtn` | Speak | बोलें | |
| `play.queue` | {{n}} waiting in the queue | कतार में {{n}} प्रतीक्षा में | |
| `play.queueEmpty` | Queue empty | कतार खाली | |
| `play.saved` | Saved sample runs | सहेजे गए नमूना रन | |
| `play.savedNote` | Real calls made earlier, replayed from the cache. | पहले की गई असली कॉल, कैश से दोबारा चलाई गई। | |
| `usage.title` | Usage | उपयोग | |
| `usage.lede` | Every call to Gnani is written to the ledger. This page reads it. | Gnani की हर कॉल लेजर में लिखी जाती है। यह पेज उसे पढ़ता है। | |
| `usage.remaining` | Remaining (estimate) | बाकी (अनुमान) | |
| `usage.calibrate` | Balance on the Gnani dashboard | Gnani डैशबोर्ड पर बैलेंस | |
| `usage.calibrateBtn` | Calibrate | मिलान करें | |
| `usage.byDay` | Calls by day | दिन के हिसाब से कॉल | |
| `usage.byKind` | By kind | प्रकार के हिसाब से | |
| `usage.ledger` | Ledger | लेजर | |
| `usage.time` | Time | समय | |
| `usage.kind` | Kind | प्रकार | |
| `usage.language` | Language | भाषा | |
| `usage.size` | Size | आकार | |
| `usage.creditsCol` | Credits | क्रेडिट | |
| `usage.cache` | Cache | कैश | |
| `usage.hit` | hit | कैश | |
| `usage.miss` | live | लाइव | |
| `usage.export` | Export CSV | CSV निर्यात करें | |
| `usage.showing` | Showing {{n}} of {{total}} rows | {{total}} में से {{n}} पंक्तियाँ | |
| `usage.more` | Show more | और दिखाएँ | |
| `usage.rateNote` | Gnani does not publish prices. Until the rates are set in config.yaml, spend is counted in calls, seconds and characters. | Gnani दरें प्रकाशित नहीं करता। जब तक config.yaml में दरें तय नहीं होतीं, खर्च कॉल, सेकंड और अक्षरों में गिना जाता है। | |
| `library.title` | Library | संग्रह | |
| `library.lede` | Radio noise used in the link lab. Only public domain, CC0 and CC BY sounds, and no recorded voices. | लिंक प्रयोगशाला में इस्तेमाल रेडियो शोर। सिर्फ़ सार्वजनिक डोमेन, CC0 और CC BY ध्वनियाँ, और कोई रिकॉर्ड की गई आवाज़ नहीं। | |
| `library.by` | by | द्वारा | |
| `library.licence` | Licence | लाइसेंस | |
| `library.accessed` | Accessed | लिया गया | |
| `library.fonts` | Typefaces | टाइपफ़ेस | |
| `about.title` | About | परिचय | |
| `about.method` | Method | पद्धति | |
| `about.simulated` | What is simulated | क्या सिम्युलेटेड है | |
| `about.cloud` | Cloud dependency | क्लाउड पर निर्भरता | |
| `about.built` | How it was built | यह कैसे बना | |
| `about.team` | Team | टीम | |
| `about.licences` | Licences | लाइसेंस | |
| `notFound.title` | No such page | ऐसा कोई पेज नहीं | |
| `notFound.body` | The page you asked for is not in this manual. | आपने जो पेज माँगा वह इस मैनुअल में नहीं है। | |
| `notFound.home` | Back to the start | शुरुआत पर लौटें | |
| `footer.licence` | Code MIT. Results CC BY 4.0. Sounds and typefaces under their own licences (see Library). | कोड MIT। नतीजे CC BY 4.0। ध्वनियाँ और टाइपफ़ेस अपने लाइसेंस के तहत (संग्रह देखें)। | |
| `footer.simulated` | Simulated link, synthetic speech. Not a radio test. | सिम्युलेटेड लिंक, सिंथेटिक आवाज़। रेडियो परीक्षण नहीं। | |

