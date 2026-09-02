Scriptname F4AI:F4AI_FeedbackMonitor extends ReferenceAlias

String Property TrainingInputPath = "Data/F4AI/training_feedback.json" Auto Const
Int Property LikeKey = 200 Auto
Int Property DislikeKey = 208 Auto

Actor LastActiveNPC

Event OnInit()
    RegisterForKey(LikeKey)
    RegisterForKey(DislikeKey)
EndEvent

Function TrackActiveSpeaker(Actor speakingNPC)
    LastActiveNPC = speakingNPC
EndFunction

Event OnKeyDown(Int aiKeyCode)
    if (LastActiveNPC == None || LastActiveNPC.IsDead())
        return
    endif

    Int rewardScore = 0
    if (aiKeyCode == LikeKey)
        rewardScore = 1
        Debug.Notification("Liked " + LastActiveNPC.GetActorBase().GetName() + "'s response.")
    elseif (aiKeyCode == DislikeKey)
        rewardScore = -1
        Debug.Notification("Disliked " + LastActiveNPC.GetActorBase().GetName() + "'s response.")
    endif

    if (rewardScore != 0)
        SendFeedbackToPython(LastActiveNPC.GetActorBase().GetName(), rewardScore)
    endif
EndEvent

Function SendFeedbackToPython(String npcName, Int score)
    String jsonPayload = "{"
    jsonPayload += "\"npc_name\": \"" + npcName + "\","
    jsonPayload += "\"reward_score\": " + score as String
    jsonPayload += "}"
    Hydra:IO:File.WriteAllText(TrainingInputPath, jsonPayload)
EndFunction
