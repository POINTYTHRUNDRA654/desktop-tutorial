Scriptname F4AI:F4AI_InterNpcManager extends Quest

String Property InterNpcInputPath = "Data/F4AI/internpc_input.json" Auto Const
String Property InterNpcOutputPath = "Data/F4AI/internpc_output.json" Auto Const
Sound Property F4AI_AudioOutputSound Auto Const

Function InitiateNpcDialogue(Actor ActorA, Actor ActorB)
    ActorA.SetVehicle(None)
    ActorB.SetVehicle(None)
    ActorA.EvaluatePackage()
    ActorB.EvaluatePackage()
    ActorA.SetLookAt(ActorB)
    ActorB.SetLookAt(ActorA)

    String jsonPayload = "{"
    jsonPayload += "\"actor_a_name\": \"" + ActorA.GetActorBase().GetName() + "\","
    jsonPayload += "\"actor_b_name\": \"" + ActorB.GetActorBase().GetName() + "\","
    jsonPayload += "\"location\": \"" + Game.GetPlayer().GetCurrentLocation().GetName() + "\""
    jsonPayload += "}"

    Hydra:IO:File.WriteAllText(InterNpcInputPath, jsonPayload)
    WaitForInterNpcAudio(ActorA, ActorB)
EndFunction

Function WaitForInterNpcAudio(Actor ActorA, Actor ActorB)
    Int timeout = 0
    While (!Hydra:IO:File.Exists(InterNpcOutputPath) && timeout < 40)
        Utility.Wait(0.2)
        timeout += 1
    EndWhile

    if (Hydra:IO:File.Exists(InterNpcOutputPath))
        F4AI_AudioOutputSound.Play(ActorA)
        Utility.Wait(3.5)
        F4AI_AudioOutputSound.Play(ActorB)
        Hydra:IO:File.Delete(InterNpcOutputPath)
    endif
EndFunction
